import { createServerORPCClient } from "@/lib/orpc.server";
import { buildAuthorsListPageData } from "@/utils/author-list-data";
import type { Locale } from "@/paraglide/runtime";

export const fetchAuthorsListPageData = async (locale: Locale) => {
  const client = createServerORPCClient();

  const [authors, skillsCount] = await Promise.all([
    client.skills.listAuthors(),
    client.skills.count(),
  ]);

  return buildAuthorsListPageData({
    authors,
    dailyMetrics: await client.metrics.dailySkillsSnapshots({ limit: 7 }),
    locale,
    skillsCount,
  });
};

export const fetchAuthorDetailPageData = async (handle: string) => {
  const client = createServerORPCClient();
  return await client.skills.getAuthorByHandle({ handle });
};

export const fetchAuthorSkills = async (handle: string) => {
  const client = createServerORPCClient();
  const result = await client.skills.search({
    authorHandle: handle,
    limit: 50,
    sort: "downloads-all-time",
  });
  return result.page;
};
