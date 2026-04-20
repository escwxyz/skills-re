import { adminClient, emailOTPClient } from "better-auth/client/plugins";
import { PUBLIC_SERVER_URL } from "astro:env/client";
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  basePath: "/auth",
  baseURL: PUBLIC_SERVER_URL,
  plugins: [adminClient(), emailOTPClient()],
  sessionOptions: {
    refetchOnWindowFocus: false,
  },
});
