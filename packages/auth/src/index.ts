// oxlint-disable require-await
import { authTables } from "@skills-re/db/schema";
import { agentAuth } from "@better-auth/agent-auth";
import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import type { GithubProfile } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP } from "better-auth/plugins";

import { nanoid } from "nanoid";

import type { createLocalDb } from "@skills-re/db";
import type { createDb } from "@skills-re/db/runtime";

export interface AuthEnv {
  ADMIN: string;
  BETTER_AUTH_SECRET: string;
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
    getAgentConfiguration: () => Promise<unknown>;
    getSession: (input: { headers: Headers }) => Promise<AuthSession>;
  };
  handler: (request: Request) => Response | Promise<Response>;
}

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
  return betterAuth({
    account: {
      accountLinking: {
        enabled: true,
        allowDifferentEmails: true,
        trustedProviders: ["google", "github", "email-password"],
        updateUserInfoOnLink: true,
      },
    },
    advanced: {
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
      agentAuth({
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
        ],
        approvalMethods: ["device_authorization", "ciba"],
        deviceAuthorizationPage: `${env.PUBLIC_SITE_URL}/device/capabilities`,
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

            const searchUrl = new URL("/search", env.PUBLIC_SITE_URL);
            searchUrl.searchParams.set("q", args.query);
            return await fetchPublicContent(
              searchUrl.pathname + searchUrl.search,
              env.PUBLIC_SITE_URL,
            );
          }

          throw new Error(`Unsupported agent capability: ${capability}`);
        },
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
        github: {
          input: false,
          required: false,
          type: "string",
        },
      },
    },
  }) as AuthInstance;
}
