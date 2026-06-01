import { createFileRoute } from "@tanstack/react-router";

import { env } from "@skills-re/env/start";
import { forwardWellKnownRequest } from "../../lib/well-known-proxy.server";

const AGENT_CONFIGURATION_PATH = "/.well-known/agent-configuration";

export const Route = createFileRoute("/.well-known/agent-configuration")({
  server: {
    handlers: {
      GET: async () =>
        await forwardWellKnownRequest({
          defaultContentType: "application/json",
          method: "GET",
          path: AGENT_CONFIGURATION_PATH,
          serverUrl: env.VITE_SERVER_URL,
          upstreamErrorMessage: "Failed to load agent configuration.",
        }),
    },
  },
});
