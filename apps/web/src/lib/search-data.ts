import type { AppRouterClient } from "@skills-re/api/routers/index";

import { formatInteger, toBrowseSkillItem } from './registry-data';
import type { BrowseSkillItem } from './registry-data';

interface SearchSkillListItem {
  author?: {
    handle?: string;
    name?: string | null;
  };
  authorHandle?: string;
  description: string;
  downloadsAllTime?: number;
  id: string;
  latestVersion?: string;
  primaryCategory?: string;
  slug: string;
  stargazerCount?: number;
  staticAudit?: {
    overallScore: number;
  } | null;
  tags?: string[];
  title: string;
}

export interface SearchPageData {
  items: BrowseSkillItem[];
  mode: "browse" | "search";
  note: string;
  query: string;
  resultLabel: string;
  titleLabel: string;
}

export const getSearchPageData = async (
  client: AppRouterClient,
  searchParams: URLSearchParams,
): Promise<SearchPageData> => {
  const query = searchParams.get("q")?.trim() ?? "";
  const result = await client.skills.search({
    limit: 12,
    query: query || undefined,
    sort: "downloads-all-time",
  });
  const items = (result.page as SearchSkillListItem[]).map(toBrowseSkillItem);
  const mode = query ? "search" : "browse";

  return {
    items,
    mode,
    note: query
      ? "Search currently returns skills only. Authors and collections need a unified public search contract."
      : "Popular skills shown from the live public index. Enter a query to search skills by title and description.",
    query,
    resultLabel: query
      ? `${formatInteger(items.length)} live skill matches`
      : `${formatInteger(items.length)} popular skills`,
    titleLabel: query ? query : "Popular skills",
  };
};
