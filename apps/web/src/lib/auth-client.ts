import { adminClient, deviceAuthorizationClient, emailOTPClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";
import { PUBLIC_SERVER_URL } from "astro:env/client";
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  basePath: "/auth",
  baseURL: PUBLIC_SERVER_URL,
  plugins: [adminClient(), apiKeyClient(), deviceAuthorizationClient(), emailOTPClient()],
  sessionOptions: {
    refetchOnWindowFocus: false,
  },
});
