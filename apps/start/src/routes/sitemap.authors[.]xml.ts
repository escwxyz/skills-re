import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/lib/constants";
import { createServerORPCClient } from "@/lib/orpc.server";
import { getAllMultilingualUrls, renderUrlEntry, wrapUrlSet } from "@/lib/sitemap";
import type { AppRouterClient } from "@skills-re/api";

export const Route = createFileRoute("/sitemap/authors.xml")({
  server: {
    handlers: {
      GET: async () => {
        const client = createServerORPCClient();
        const authors: Awaited<ReturnType<AppRouterClient["skills"]["listAuthors"]>>["page"] = [];
        let cursor: string | undefined;

        while (true) {
          const page = await client.skills.listAuthors({
            cursor,
            limit: 100,
            sort: "alphabetical",
          });

          authors.push(...page.page);

          if (page.isDone) {
            break;
          }

          cursor = page.continueCursor || undefined;
        }

        const xml = wrapUrlSet(
          authors.flatMap((author) =>
            getAllMultilingualUrls([`/authors/${encodeURIComponent(author.handle)}`]).map((path) =>
              renderUrlEntry({
                changefreq: "weekly",
                loc: `${SITE_URL}${path}`,
                priority: "0.6",
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
