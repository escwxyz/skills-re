// oxlint-disable require-await
import { authTables } from "@skills-re/db/schema";
// import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP } from "better-auth/plugins";
// import { jwt } from "better-auth/plugins";
// import { oauthProvider } from "@better-auth/oauth-provider";

import { nanoid } from "nanoid";

import type { createLocalDb } from "@skills-re/db";
import type { createDb } from "@skills-re/db/runtime";

export interface AuthEnv {
  ADMIN: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  CORS_ORIGIN: string;
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

const resendApiUrl = "https://api.resend.com/emails";

export function createAuth({ db, env }: CreateAuthOptions) {
  return betterAuth({
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github"],
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
    baseURL: env.BETTER_AUTH_URL,
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
      // apiKey(),
      // jwt(),
      // oauthProvider({
      //   // for agent auth https://better-auth.com/docs/plugins/oauth-provider
      //   loginPage: "/sign-in",
      //   consentPage: "/consent",
      // }),
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
        mapProfileToUser: async (profile: {
          avatar_url?: string;
          email?: string;
          login?: string;
          name?: string;
        }) => ({
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
    trustedOrigins: [env.CORS_ORIGIN, env.BETTER_AUTH_URL],
  });
}
