import type { AppRouterClient } from "@skills-re/api/routers/index";

import { formatInteger, toBrowseSkillItem } from "./registry-data";
import type { BrowseSkillItem } from "./registry-data";

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
  mode: "browse" | "search" | "rate_limited";
  note: string;
  query: string;
  resultLabel: string;
  titleLabel: string;
}

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
    return {
      items: [],
      mode: "browse",
      note: "Enter a query to search skills with semantic AI search.",
      query: "",
      resultLabel: "",
      titleLabel: "Search skills",
    };
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
    throw error;
  }
  const items = (result.page as SearchSkillListItem[]).map(toBrowseSkillItem);

  return {
    items,
    mode: "search",
    note: "",
    query,
    resultLabel: `${formatInteger(items.length)} AI matches`,
    titleLabel: query,
  };
};
