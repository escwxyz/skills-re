import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/lib/constants";
import { getAllMultilingualUrls } from "@/lib/sitemap";

const disallowedPaths = getAllMultilingualUrls(["/dashboard"]);

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const robotsTxt = [
          "User-agent: SemrushBot",
          "Disallow: /",
          "",
          "User-agent: SiteAuditBot",
          "Disallow: /",
          "",
          "User-agent: SemrushBot-BA",
          "Disallow: /",
          "",
          "User-agent: SemrushBot-SI",
          "Disallow: /",
          "",
          "User-agent: SemrushBot-SWA",
          "Disallow: /",
          "",
          "User-agent: SemrushBot-OCOB",
          "Disallow: /",
          "",
          "User-agent: SemrushBot-FT",
          "Disallow: /",
          "",
          "User-agent: SemrushBot-ESI",
          "Disallow: /",
          "",
          "User-agent: meta-externalagent",
          "Disallow: /",
          "",
          "User-agent: *",
          "Allow: /",
          "Content-Signal: ai-train=no, search=yes, ai-input=no",
          ...disallowedPaths.map((path) => `Disallow: ${path}`),
          "Disallow: /api",
          "Disallow: /_serverFn",
          "",
          `Sitemap: ${new URL("/sitemap.xml", SITE_URL).href}`,
        ].join("\n");

        return new Response(robotsTxt, {
          headers: { "Content-Type": "text/plain" },
        });
      },
    },
  },
});
