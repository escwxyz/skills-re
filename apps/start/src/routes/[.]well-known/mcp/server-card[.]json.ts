import { createFileRoute } from "@tanstack/react-router";

import { env } from "@skills-re/env/start";
import { forwardWellKnownRequest } from "../../../lib/well-known-proxy.server";

const SERVER_CARD_PATH = "/.well-known/mcp/server-card.json";

export const Route = createFileRoute("/.well-known/mcp/server-card.json")({
  server: {
    handlers: {
      GET: async () =>
        await forwardWellKnownRequest({
          defaultContentType: "application/json",
          method: "GET",
          path: SERVER_CARD_PATH,
          serverUrl: env.VITE_SERVER_URL,
          upstreamErrorMessage: "Failed to load MCP server card.",
        }),
    },
  },
});
