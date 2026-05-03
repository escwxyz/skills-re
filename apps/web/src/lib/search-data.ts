import type { AppRouterClient } from "@skills-re/api/routers/index";

import { formatInteger, toBrowseSkillItem } from "./registry-data";
import type { AiMatch, BrowseSkillItem } from "./registry-data";

export interface SearchSkillListItem {
  author?: {
    handle?: string;
    name?: string | null;
  };
  authorHandle?: string;
  aiMatch?: AiMatch;
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
  mode: "browse" | "search" | "rate_limited";
  note: string;
  query: string;
  resultLabel: string;
  titleLabel: string;
}

export const getEmptySearchPageData = (): SearchPageData => ({
  items: [],
  mode: "browse",
  note: "Describe what you're looking for and the semantic index will find the closest skills.",
  query: "",
  resultLabel: "",
  titleLabel: "Search skills",
});

export const getSearchUnavailablePageData = (query: string): SearchPageData => ({
  items: [],
  mode: "browse",
  note: "The semantic search backend is unavailable right now. Try again in a moment.",
  query,
  resultLabel: "",
  titleLabel: query || "Search skills",
});

export const buildSearchPageData = (query: string, page: SearchSkillListItem[]): SearchPageData => {
  const items = page.map(toBrowseSkillItem);

  return {
    items,
    mode: "search",
    note: "",
    query,
    resultLabel: `${formatInteger(items.length)} AI matches`,
    titleLabel: query,
  };
};

const isRateLimitError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") {
    return false;
  }
  const e = err as { status?: unknown; code?: unknown };
  return e.status === 429 || e.code === "RATE_LIMITED" || e.code === "TOO_MANY_REQUESTS";
};

export const getSearchPageData = async (
  client: AppRouterClient,
  searchParams: URLSearchParams,
): Promise<SearchPageData> => {
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return getEmptySearchPageData();
  }

  let result: Awaited<ReturnType<typeof client.skills.search>>;
  try {
    result = await client.skills.search({ query, rewriteQuery: true });
  } catch (error) {
    if (isRateLimitError(error)) {
      return {
        items: [],
        mode: "rate_limited",
        note: "",
        query,
        resultLabel: "",
        titleLabel: query,
      };
    }
    return getSearchUnavailablePageData(query);
  }

  return buildSearchPageData(query, result.page as SearchSkillListItem[]);
};
