import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/lib/constants";
import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchCollectionsListPage } from "@/functions/collections/collections.server";
import { getAllMultilingualUrls, renderUrlEntry, wrapUrlSet } from "@/lib/sitemap";

export const Route = createFileRoute("/sitemap/collections.xml")({
  server: {
    handlers: {
      GET: async () => {
        const client = createServerORPCClient();
        const entries: Awaited<ReturnType<typeof fetchCollectionsListPage>>["page"] = [];
        let cursor: string | undefined;

        while (true) {
          const page = await fetchCollectionsListPage({
            client,
            cursor,
          });

          entries.push(...page.page);

          if (page.isDone) {
            break;
          }

          cursor = page.continueCursor || undefined;
        }

        const xml = wrapUrlSet(
          entries.flatMap((collection) =>
            getAllMultilingualUrls([`/collections/${collection.slug}`]).map((path) =>
              renderUrlEntry({
                changefreq: "weekly",
                loc: `${SITE_URL}${path}`,
                priority: "0.7",
              }),
            ),
          ),
        );

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
