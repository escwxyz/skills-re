import { createFileRoute } from "@tanstack/react-router";

import { env } from "@skills-re/env/start";
import { forwardWellKnownRequest } from "../../lib/well-known-proxy.server";

const OAUTH_AUTHORIZATION_SERVER_PATH = "/.well-known/oauth-authorization-server";

export const Route = createFileRoute("/.well-known/oauth-authorization-server")({
  server: {
    handlers: {
      GET: async () =>
        await forwardWellKnownRequest({
          defaultContentType: "application/json",
          method: "GET",
          path: OAUTH_AUTHORIZATION_SERVER_PATH,
          serverUrl: env.VITE_SERVER_URL,
          upstreamErrorMessage: "Failed to load OAuth authorization server metadata.",
        }),
    },
  },
});
