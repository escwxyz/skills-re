import { createDb } from "@skills-re/db/runtime";
import { env } from "@skills-re/env/server";

import { createAuth } from "./index";

export function createRuntimeAuth() {
  return createAuth({
    db: createDb(),
    env: {
      ADMIN: env.ADMIN,
      BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: env.BETTER_AUTH_URL,
      CORS_ORIGIN: env.CORS_ORIGIN,
      GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
      GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
      RESEND_API_KEY: env.RESEND_API_KEY,
    },
  });
}
