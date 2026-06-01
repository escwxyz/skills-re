import { createFileRoute } from "@tanstack/react-router";

import { env } from "@skills-re/env/start";
import { forwardWellKnownRequest } from "../../../lib/well-known-proxy.server";

const INDEX_PATH = "/.well-known/agent-skills/index.json";

export const Route = createFileRoute("/.well-known/agent-skills/index.json")({
  server: {
    handlers: {
      GET: async () =>
        await forwardWellKnownRequest({
          method: "GET",
          path: INDEX_PATH,
          serverUrl: env.VITE_SERVER_URL,
        }),
      HEAD: async () =>
        await forwardWellKnownRequest({
          method: "HEAD",
          path: INDEX_PATH,
          serverUrl: env.VITE_SERVER_URL,
        }),
    },
  },
});
