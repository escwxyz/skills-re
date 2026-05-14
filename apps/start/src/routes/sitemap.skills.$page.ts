import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/lib/constants";
import { createServerORPCClient } from "@/lib/orpc.server";
import {
  SITEMAP_SKILLS_PAGE_SIZE,
  parseSitemapSkillsPageParam,
  renderUrlEntry,
  wrapUrlSet,
} from "@/lib/sitemap";
import { buildSkillDetailPath } from "@/lib/skill-path";

export const Route = createFileRoute("/sitemap/skills/$page")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const page = parseSitemapSkillsPageParam(params.page);

        if (!page) {
          return new Response("Not Found", { status: 404 });
        }

        const client = createServerORPCClient();
        const skillsCount = await client.skills.count();
        const totalPages = Math.max(1, Math.ceil(skillsCount / SITEMAP_SKILLS_PAGE_SIZE));

        if (page > totalPages) {
          return new Response("Not Found", { status: 404 });
        }

        let cursor: string | undefined;
        let result: Awaited<ReturnType<typeof client.skills.search>> | null = null;

        for (let index = 1; index <= page; index += 1) {
          result = await client.skills.search({
            cursor,
            limit: SITEMAP_SKILLS_PAGE_SIZE,
            sort: "downloads-all-time",
          });

          cursor = result.continueCursor;
        }

        const xml = wrapUrlSet(
          (result?.page ?? []).flatMap((skill) => {
            const detailPath = buildSkillDetailPath({
              authorHandle: skill.authorHandle ?? skill.author?.handle,
              repoName: skill.repoName ?? "",
              skillSlug: skill.slug,
            });

            return [
              renderUrlEntry({
                changefreq: "weekly",
                loc: `${SITE_URL}${detailPath}`,
                priority: "0.8",
              }),
              renderUrlEntry({
                changefreq: "weekly",
                loc: `${SITE_URL}${detailPath}/audit`,
                priority: "0.6",
              }),
              renderUrlEntry({
                changefreq: "weekly",
                loc: `${SITE_URL}${detailPath}/changelog`,
                priority: "0.6",
              }),
              renderUrlEntry({
                changefreq: "weekly",
                loc: `${SITE_URL}${detailPath}/file-tree`,
                priority: "0.6",
              }),
              renderUrlEntry({
                changefreq: "weekly",
                loc: `${SITE_URL}${detailPath}/reviews`,
                priority: "0.6",
              }),
            ];
          }),
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
