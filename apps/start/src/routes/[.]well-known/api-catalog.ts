import { createFileRoute } from "@tanstack/react-router";

import { env } from "@skills-re/env/start";

export const Route = createFileRoute("/.well-known/api-catalog")({
  server: {
    handlers: {
      GET: () => {
        const serverOrigin = new URL(env.VITE_SERVER_URL).origin;

        const catalog = {
          linkset: [
            {
              anchor: serverOrigin,
              "service-desc": [
                {
                  href: `${serverOrigin}/spec.json`,
                  type: "application/vnd.oai.openapi+json;version=3.0",
                },
              ],
              "service-doc": [{ href: `${serverOrigin}/docs` }],
              status: [{ href: `${serverOrigin}/` }],
            },
          ],
        };

        return Response.json(catalog, {
          status: 200,
          headers: { "Content-Type": "application/linkset+json" },
        });
      },
    },
  },
});
