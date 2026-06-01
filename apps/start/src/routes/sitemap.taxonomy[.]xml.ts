import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/lib/constants";
import { createServerORPCClient } from "@/lib/orpc.server";
import { getAllMultilingualUrls, renderUrlEntry, wrapUrlSet } from "@/lib/sitemap";

export const Route = createFileRoute("/sitemap/taxonomy.xml")({
  server: {
    handlers: {
      GET: async () => {
        const client = createServerORPCClient();
        const [categories, tags] = await Promise.all([
          client.categories.list({ all: true, limit: 100 }),
          client.tags.listIndexable({ limit: 500 }),
        ]);

        const xml = wrapUrlSet([
          ...categories.flatMap((category) =>
            getAllMultilingualUrls([`/categories/${category.slug}`]).map((path) =>
              renderUrlEntry({
                changefreq: "weekly",
                loc: `${SITE_URL}${path}`,
                priority: "0.7",
              }),
            ),
          ),
          ...tags.flatMap((tag) =>
            getAllMultilingualUrls([`/tags/${tag.slug}`]).map((path) =>
              renderUrlEntry({
                changefreq: "weekly",
                loc: `${SITE_URL}${path}`,
                priority: "0.6",
              }),
            ),
          ),
        ]);

        return new Response(xml, {
          headers: {
            "Cache-Control": "public, max-age=3600",
            "Content-Type": "application/xml; charset=utf-8",
          },
        });
      },
    },
  },
});
