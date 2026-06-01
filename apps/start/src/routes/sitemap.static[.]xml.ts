// oxlint-disable no-nested-ternary
import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/lib/constants";
import { getAllMultilingualUrls, renderUrlEntry, wrapUrlSet } from "@/lib/sitemap";
import { locales } from "@/paraglide/runtime";

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

const stripLocalePrefix = (path: string) => {
  for (const locale of locales) {
    if (path === `/${locale}` || path === `/${locale}/`) {
      return "/";
    }

    if (path.startsWith(`/${locale}/`)) {
      return path.slice(locale.length + 1);
    }
  }

  return path;
};

export const Route = createFileRoute("/sitemap/static.xml")({
  server: {
    handlers: {
      GET: async () => {
        const xml = wrapUrlSet(
          getAllMultilingualUrls(STATIC_PATHS).map((path) => {
            const basePath = stripLocalePrefix(path);

            return renderUrlEntry({
              changefreq: basePath === "/" || basePath === "/skills" ? "daily" : "weekly",
              loc: `${SITE_URL}${path}`,
              priority:
                basePath === "/"
                  ? "1.0"
                  : basePath === "/skills"
                    ? "0.9"
                    : basePath === "/submit"
                      ? "0.7"
                      : basePath === "/privacy" || basePath === "/terms" || basePath === "/cookies"
                        ? "0.5"
                        : "0.8",
            });
          }),
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
