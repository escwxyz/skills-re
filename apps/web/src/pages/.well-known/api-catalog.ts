import type { APIRoute } from "astro";
import { SERVER_URL } from "astro:env/server";

export const GET: APIRoute = () => {
  const serverOrigin = new URL(SERVER_URL).origin;

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
};
