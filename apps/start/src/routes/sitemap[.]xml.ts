import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/lib/constants";
import { createServerORPCClient } from "@/lib/orpc.server";
import { buildSitemapSkillsPageUrl, wrapSitemapIndex } from "@/lib/sitemap";

const SITEMAP_SKILLS_PAGE_SIZE = 5000;

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const client = createServerORPCClient();
        const skillsCount = await client.skills.count();
        const totalPages = Math.max(1, Math.ceil(skillsCount / SITEMAP_SKILLS_PAGE_SIZE));

        const xml = wrapSitemapIndex([
          { loc: `${SITE_URL}/sitemap/static.xml` },
          { loc: `${SITE_URL}/sitemap/authors.xml` },
          { loc: `${SITE_URL}/sitemap/taxonomy.xml` },
          { loc: `${SITE_URL}/sitemap/docs.xml` },
          { loc: `${SITE_URL}/sitemap/collections.xml` },
          ...Array.from({ length: totalPages }, (_, index) => ({
            loc: buildSitemapSkillsPageUrl(index + 1),
          })),
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
