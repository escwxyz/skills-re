// oxlint-disable require-await
import { authTables } from "@skills-re/db/schema";
import { agentAuth } from "@better-auth/agent-auth";
import { apiKey } from "@better-auth/api-key";
import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import type { GithubProfile } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  bearer,
  deviceAuthorization,
  emailOTP,
  jwt,
  lastLoginMethod,
} from "better-auth/plugins";

import { nanoid } from "nanoid";

import type { createLocalDb } from "@skills-re/db";
import type { createDb } from "@skills-re/db/runtime";

export interface AuthEnv {
  ADMIN: string;
  BETTER_AUTH_SECRET: string;
  AUTH_COOKIE_DOMAIN?: string;
  PUBLIC_SERVER_URL: string;
  PUBLIC_SITE_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  RESEND_API_KEY: string;
}

export type AuthDb = ReturnType<typeof createDb> | ReturnType<typeof createLocalDb>;

export interface CreateAuthOptions {
  db: AuthDb;
  env: AuthEnv;
}

export type AuthSession = {
  session: {
    expiresAt: Date | string;
    id: string;
    userId: string;
  };
  user: {
    bio?: string | null;
    email?: string;
    github?: string | null;
    id: string;
    image?: string | null;
    name?: string;
    role?: string | null;
  };
} | null;

export interface AuthInstance {
  api: {
    createApiKey: (input: {
      body: { expiresIn?: number; name?: string; prefix?: string; userId?: string };
    }) => Promise<{ expiresAt: Date | null; key: string } | null>;
    verifyApiKey: (input: {
      body: { key: string };
    }) => Promise<{ valid: boolean; key: { expiresAt: Date | null; referenceId: string } | null }>;
    getAgentConfiguration: () => Promise<unknown>;
    getOAuthServerConfig: (input?: { headers?: HeadersInit }) => Promise<unknown>;
    getOpenIdConfig: (input?: { headers?: HeadersInit }) => Promise<unknown>;
    getSession: (input: { headers: Headers }) => Promise<AuthSession>;
    signOut: (input: { asResponse: true; headers: Headers }) => Promise<Response>;
  };
  handler: (request: Request) => Response | Promise<Response>;
}

const LAST_USED_LOGIN_METHOD_COOKIE_NAME = "skills-re.last_used_login_method";

const parseCookieHeader = (cookieHeader: string | null): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  const parsed: Record<string, string> = {};

  for (const part of cookieHeader.split(";")) {
    const trimmedPart = part.trim();
    if (!trimmedPart) {
      continue;
    }

    const separatorIndex = trimmedPart.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const name = trimmedPart.slice(0, separatorIndex).trim();
    const value = trimmedPart.slice(separatorIndex + 1).trim();
    parsed[name] = value;
  }

  return parsed;
};

const hasFunctionalCookieConsent = (cookieHeader: string | null): boolean => {
  const cookies = parseCookieHeader(cookieHeader);
  if (!cookies.cookiePreferences) {
    return false;
  }

  try {
    const parsed = JSON.parse(cookies.cookiePreferences);
    return parsed.functional === true;
  } catch {
    return false;
  }
};

const stripCookieFromResponse = (response: Response, cookieName: string): Response => {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (setCookies.length === 0) {
    return response;
  }

  const filteredSetCookies = setCookies.filter((cookie) => !cookie.startsWith(`${cookieName}=`));
  if (filteredSetCookies.length === setCookies.length) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.delete("set-cookie");
  for (const cookie of filteredSetCookies) {
    headers.append("set-cookie", cookie);
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

// replace with https://alchemy.run/providers/cloudflare/email-sender/
const resendApiUrl = "https://api.resend.com/emails";

export const normalizePublicPath = (path: string) => {
  const trimmedPath = path.trim();

  if (!trimmedPath) {
    return "/";
  }

  if (trimmedPath.startsWith("//") || trimmedPath.includes("://")) {
    throw new Error("Public page paths must not include a protocol.");
  }

  return trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;
};

const fetchPublicContent = async (path: string, baseURL: string) => {
  const response = await fetch(new URL(normalizePublicPath(path), baseURL));

  return {
    body: await response.text(),
    contentType: response.headers.get("content-type") ?? "text/plain",
    status: response.status,
    url: response.url,
  };
};

export function createAuth({ db, env }: CreateAuthOptions): AuthInstance {
  const auth = betterAuth({
    account: {
      accountLinking: {
        enabled: true,
        allowDifferentEmails: true,
        trustedProviders: ["google", "github", "email-password"],
        updateUserInfoOnLink: true,
      },
    },
    advanced: {
      cookiePrefix: "skills-re",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      },
      database: {
        generateId: () => nanoid(),
      },
      ipAddress: {
        ipAddressHeaders: ["x-client-ip", "x-forwarded-for", "cf-connecting-ip"],
      },
      crossSubDomainCookies: env.AUTH_COOKIE_DOMAIN
        ? {
            enabled: true,
            domain: env.AUTH_COOKIE_DOMAIN,
          }
        : {
            enabled: false,
          },
    },
    basePath: "/auth",
    baseURL: env.PUBLIC_SERVER_URL,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: authTables,
      usePlural: true,
    }),
    databaseHooks: {
      user: {
        create: {
          before: (user) => {
            const adminEmails = new Set(
              env.ADMIN.split(/[,\s]+/)
                .map((email) => email.trim().toLowerCase())
                .filter((email) => email.length > 0),
            );

            if (
              typeof user.email === "string" &&
              user.role !== "admin" &&
              adminEmails.has(user.email.toLowerCase())
            ) {
              return Promise.resolve({
                data: {
                  ...user,
                  role: "admin",
                },
              });
            }

            return Promise.resolve();
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      admin(),
      apiKey(),
      bearer(),
      jwt({
        jwt: {
          issuer: env.PUBLIC_SERVER_URL,
        },
      }),
      oauthProvider({
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        consentPage: `${env.PUBLIC_SITE_URL}/device/capabilities`,
        grantTypes: ["authorization_code", "refresh_token"],
        loginPage: `${env.PUBLIC_SITE_URL}/auth`,
        scopes: [
          "openid",
          "profile",
          "email",
          "offline_access",
          "skills:read",
          "skills:library",
          "skills:usage",
        ],
        silenceWarnings: {
          oauthAuthServerConfig: true,
          openidConfig: true,
        },
        validAudiences: [env.PUBLIC_SERVER_URL, `${env.PUBLIC_SERVER_URL}/mcp`],
      }),
      // Keep agentAuth's /device/code endpoint out of the public auth surface.
      // Strip the /device/code endpoint from agentAuth to avoid conflict with
      // the deviceAuthorization plugin. We only use CIBA for agent approval
      // (approvalMethods: ["ciba"]), so this endpoint is unused.
      (() => {
        const plugin = agentAuth({
          capabilities: [
            {
              description: "Fetch a public page from skills.re by path.",
              input: {
                additionalProperties: false,
                properties: {
                  path: {
                    type: "string",
                  },
                },
                required: ["path"],
                type: "object",
              },
              name: "read_public_page",
            },
            {
              description: "Fetch the public search page for a query string.",
              input: {
                additionalProperties: false,
                properties: {
                  query: {
                    type: "string",
                  },
                },
                required: ["query"],
                type: "object",
              },
              name: "search_site",
            },
            {
              description: "Resolve public skill install metadata for CLI or MCP clients.",
              input: {
                additionalProperties: false,
                properties: {
                  skill: {
                    type: "string",
                  },
                  version: {
                    type: "string",
                  },
                },
                required: ["skill"],
                type: "object",
              },
              name: "resolve_skill_install",
            },
          ],
          approvalMethods: ["ciba"],
          modes: ["delegated"],
          providerDescription: "Public website content and content discovery for AI agents.",
          providerName: "skills.re",
          onExecute: async ({ capability, arguments: args }) => {
            if (capability === "read_public_page") {
              if (!args || typeof args !== "object" || typeof args.path !== "string") {
                throw new Error("read_public_page requires a string path.");
              }

              return await fetchPublicContent(args.path, env.PUBLIC_SITE_URL);
            }

            if (capability === "search_site") {
              if (!args || typeof args !== "object" || typeof args.query !== "string") {
                throw new Error("search_site requires a string query.");
              }

              const searchUrl = new URL("/skills", env.PUBLIC_SITE_URL);
              searchUrl.searchParams.set("mode", "search");
              searchUrl.searchParams.set("q", args.query);
              return await fetchPublicContent(
                searchUrl.pathname + searchUrl.search,
                env.PUBLIC_SITE_URL,
              );
            }

            if (capability === "resolve_skill_install") {
              if (!args || typeof args !== "object" || typeof args.skill !== "string") {
                throw new Error("resolve_skill_install requires a string skill.");
              }

              const installUrl = new URL("/cli/skills/resolve-install", env.PUBLIC_SERVER_URL);
              installUrl.searchParams.set("skill", args.skill);
              if (typeof args.version === "string") {
                installUrl.searchParams.set("version", args.version);
              }
              const response = await fetch(installUrl);
              if (!response.ok) {
                throw new Error(`Install metadata request failed: ${response.status}`);
              }
              return await response.json();
            }

            throw new Error(`Unsupported agent capability: ${capability}`);
          },
        });
        const { deviceCode: _deviceCode, ...agentEndpoints } = plugin.endpoints;
        return { ...plugin, endpoints: agentEndpoints as typeof plugin.endpoints };
      })(),
      deviceAuthorization({
        schema: {},
        validateClient: (clientId) => clientId === "cli",
        verificationUri: `${env.PUBLIC_SITE_URL}/device`,
      }),
      emailOTP({
        allowedAttempts: 3,
        expiresIn: 300,
        otpLength: 6,
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type === "sign-in") {
            const response = await fetch(resendApiUrl, {
              body: JSON.stringify({
                from: "SKILLS.re <noreply@mail.skills.re>",
                template: {
                  id: "5d34318d-95ef-4c27-bca7-8b608c964316",
                  variables: {
                    VERIFICATION_CODE: otp,
                  },
                },
                to: email,
              }),
              headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              method: "POST",
            });

            if (!response.ok) {
              throw new Error(`Failed to send OTP email: ${await response.text()}`);
            }
          }
        },
      }),
      lastLoginMethod({
        cookieName: "skills-re.last_used_login_method",
        maxAge: 60 * 60 * 24 * 30,
      }),
    ],
    secret: env.BETTER_AUTH_SECRET,
    session: {
      expiresIn: 60 * 60 * 24 * 15,
      updateAge: 60 * 60 * 24 * 7,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        mapProfileToUser: async (profile: { email?: string; name?: string; picture?: string }) => ({
          email: profile.email,
          image: profile.picture,
          name: profile.name,
        }),
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        mapProfileToUser: async (profile: GithubProfile) => ({
          bio: typeof profile.bio === "string" ? profile.bio : undefined,
          email: profile.email,
          github: profile.login,
          image: profile.avatar_url,
          name: profile.name || profile.login,
        }),
      },
    },
    telemetry: {
      enabled: false,
    },
    trustedOrigins: [env.PUBLIC_SITE_URL, env.PUBLIC_SERVER_URL],
    user: {
      additionalFields: {
        bio: {
          input: false,
          required: false,
          type: "string",
        },
        github: {
          input: false,
          required: false,
          type: "string",
        },
      },
    },
  });

  return {
    ...auth,
    handler: async (request: Request) => {
      const response = await auth.handler(request);
      if (hasFunctionalCookieConsent(request.headers.get("cookie"))) {
        return response;
      }

      return stripCookieFromResponse(response, LAST_USED_LOGIN_METHOD_COOKIE_NAME);
    },
  } as AuthInstance;
}
