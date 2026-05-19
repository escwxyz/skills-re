import { createFileRoute } from "@tanstack/react-router";

import { env } from "@skills-re/env/start";

const TIMEOUT_MS = 5000;

export const Route = createFileRoute("/.well-known/openid-configuration")({
  server: {
    handlers: {
      GET: async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const response = await fetch(
            new URL("/.well-known/openid-configuration", env.VITE_SERVER_URL),
            { signal: controller.signal },
          );

          if (!response.ok) {
            return new Response("Failed to load OpenID configuration.", {
              status: response.status,
              headers: { "Content-Type": "text/plain" },
            });
          }

          const body = response.body === null ? null : await response.text();
          return new Response(body, {
            status: response.status,
            headers: {
              "Content-Type": response.headers.get("content-type") ?? "application/json",
            },
          });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return new Response("Upstream request timed out.", {
              status: 504,
              headers: { "Content-Type": "text/plain" },
            });
          }

          return new Response(
            error instanceof Error ? error.message : "Failed to reach upstream.",
            {
              status: 502,
              headers: { "Content-Type": "text/plain" },
            },
          );
        } finally {
          clearTimeout(timeout);
        }
      },
    },
  },
});
