import { createLocalDb } from "@skills-re/db";

import { createAuth } from "./index";
import type { AuthInstance } from "./index";

const auth: AuthInstance = createAuth({
  db: createLocalDb({
    url: process.env.BETTER_AUTH_DB_URL ?? "file:./.better-auth.db",
  }),
  env: {
    ADMIN: process.env.ADMIN ?? "",
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "local-dev-secret-local-dev-secret",
    PUBLIC_SERVER_URL: process.env.PUBLIC_SERVER_URL ?? "http://localhost:3000",
    PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL ?? "http://localhost:4321",
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ?? "",
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ?? "",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  },
});

export default auth;
export { auth };
