import { adminClient, deviceAuthorizationClient, emailOTPClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";
// import { env } from "@skills-re/env/web";
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  basePath: "/auth",
  baseURL: "http://localhost:3000",
  // baseURL: env.PUBLIC_SERVER_URL,
  plugins: [adminClient(), apiKeyClient(), deviceAuthorizationClient(), emailOTPClient()],
  sessionOptions: {
    refetchOnWindowFocus: false,
  },
});
