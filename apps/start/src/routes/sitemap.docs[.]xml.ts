import { createFileRoute } from "@tanstack/react-router";
import { allDocs } from "content-collections";

import { SITE_URL } from "@/lib/constants";
import { renderUrlEntry, wrapUrlSet } from "@/lib/sitemap";

const DOCS = allDocs
  .filter((doc) => doc._meta.directory === "en")
  .toSorted((a, b) => a.order - b.order);

export const Route = createFileRoute("/sitemap/docs.xml")({
  server: {
    handlers: {
      GET: async () => {
        const xml = wrapUrlSet(
          DOCS.map((doc) =>
            renderUrlEntry({
              changefreq: "weekly",
              loc: `${SITE_URL}/docs/${doc._meta.path.split("/")[1]}`,
              priority: "0.6",
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
