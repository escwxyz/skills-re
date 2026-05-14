// oxlint-disable no-nested-ternary
import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/lib/constants";
import { wrapUrlSet, renderUrlEntry } from "@/lib/sitemap";

const STATIC_PATHS = [
  "/",
  "/skills",
  "/authors",
  "/categories",
  "/collections",
  "/tags",
  "/changelogs",
  "/submit",
  "/docs",
  "/faq",
  "/imprint",
  "/privacy",
  "/terms",
  "/cookies",
];

export const Route = createFileRoute("/sitemap/static.xml")({
  server: {
    handlers: {
      GET: async () => {
        const xml = wrapUrlSet(
          STATIC_PATHS.map((path) =>
            renderUrlEntry({
              changefreq: path === "/" ? "daily" : path === "/skills" ? "daily" : "weekly",
              loc: `${SITE_URL}${path}`,
              priority:
                path === "/"
                  ? "1.0"
                  : path === "/skills"
                    ? "0.9"
                    : path === "/submit"
                      ? "0.7"
                      : path === "/privacy" || path === "/terms" || path === "/cookies"
                        ? "0.5"
                        : "0.8",
            }),
          ),
        );

        return await new Response(xml, {
          headers: {
            "Cache-Control": "public, max-age=3600",
            "Content-Type": "application/xml; charset=utf-8",
          },
        });
      },
    },
  },
});
