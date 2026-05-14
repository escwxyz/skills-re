import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/lib/constants";
import { getAllMultilingualUrls } from "@/lib/sitemap";

const disallowedPaths = getAllMultilingualUrls(["/dashboard", "/api"]);

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const robotsTxt = [
          "User-agent: *",
          "Allow: /",
          ...disallowedPaths.map((path) => `Disallow: ${path}`),
          "",
          `Sitemap: ${new URL("/sitemap.xml", SITE_URL).href}`,
        ].join("\n");

        return await new Response(robotsTxt, {
          headers: { "Content-Type": "text/plain" },
        });
      },
    },
  },
});
