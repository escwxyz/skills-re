import type { AppRouterClient } from "@skills-re/api";

export type BrowseSort =
  | "newest"
  | "updated"
  | "views"
  | "downloads-trending"
  | "downloads-all-time"
  | "stars";

export const DEFAULT_BROWSE_SORT: BrowseSort = "newest";
export const SKILLS_BROWSE_PAGE_SIZE = 24;

const SORT_SEQUENCE: BrowseSort[] = [
  "downloads-all-time",
  "downloads-trending",
  "newest",
  "updated",
  "stars",
  "views",
];

const VALID_BROWSE_SORTS = new Set<BrowseSort>([
  "downloads-all-time",
  "downloads-trending",
  "newest",
  "stars",
  "updated",
  "views",
]);

export interface SkillsBrowseFilters {
  activeClass: string;
  page: number;
  query: string;
  sort: BrowseSort;
  tags: string[];
}

export interface NormalizedSkillsBrowseFilters {
  activeClass: string;
  query: string;
  sort: BrowseSort;
  tags: string[];
}

export interface SkillsBrowseMetaData {
  categories: {
    count: number;
    id: string;
    name: string;
    slug: string;
  }[];
  counts: {
    activeFilters: number;
    categories: number;
    newSkills30d: number;
    skills: number;
  };
  tags: {
    count: number;
    id: string;
    slug: string;
  }[];
}

export interface SkillsBrowseSearchInput {
  category?: string;
  mode?: string;
  q?: string;
  searchMode?: string;
  sort?: BrowseSort | null;
  tag?: string[];
  tags?: string[];
}

export interface SkillsBrowsePageSlice {
  continueCursor: string;
  isDone: boolean;
  page: Awaited<ReturnType<AppRouterClient["skills"]["search"]>>["page"];
}

export const normalizeSkillsBrowseFilters = (
  input: SkillsBrowseSearchInput,
): NormalizedSkillsBrowseFilters => {
  const activeClass = input.category?.trim() || "all";
  const tags = [
    ...new Set(
      [...(input.tag ?? []), ...(input.tags ?? [])].map((tag) => tag.trim()).filter(Boolean),
    ),
  ].toSorted();

  return {
    activeClass,
    query: input.q?.trim() ?? "",
    sort: input.sort ?? DEFAULT_BROWSE_SORT,
    tags,
  };
};

export const shouldNoIndexSkillsBrowseSearch = (input: SkillsBrowseSearchInput): boolean =>
  Boolean(
    input.category?.trim() ||
    input.mode?.trim() ||
    input.q?.trim() ||
    input.searchMode?.trim() ||
    input.sort ||
    input.tag?.some((tag) => tag.trim()) ||
    input.tags?.some((tag) => tag.trim()),
  );

export const buildBrowseUrl = (filters: SkillsBrowseFilters): string => {
  const params = new URLSearchParams();
  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }
  if (filters.activeClass !== "all") {
    params.set("category", filters.activeClass);
  }
  for (const tag of filters.tags) {
    params.append("tag", tag);
  }
  if (filters.sort !== DEFAULT_BROWSE_SORT) {
    params.set("sort", filters.sort);
  }
  if (filters.page > 1) {
    params.set("page", String(filters.page));
  }
  const qs = params.toString();
  return qs ? `/skills?${qs}` : "/skills";
};

export const getNextBrowseSort = (current: BrowseSort): BrowseSort => {
  const idx = SORT_SEQUENCE.indexOf(current);
  return idx === -1
    ? DEFAULT_BROWSE_SORT
    : (SORT_SEQUENCE[(idx + 1) % SORT_SEQUENCE.length] ?? DEFAULT_BROWSE_SORT);
};

export const getBrowseSort = (value: string | null): BrowseSort =>
  value && VALID_BROWSE_SORTS.has(value as BrowseSort)
    ? (value as BrowseSort)
    : DEFAULT_BROWSE_SORT;

export const parsePageNumber = (value: string | null) => {
  if (!value) {
    return 1;
  }

  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
};

export const encodeSearchOffsetCursor = (offset: number) =>
  btoa(JSON.stringify({ offset })).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

export const getBrowseSortLabel = (sort: BrowseSort) => {
  switch (sort) {
    case "downloads-trending": {
      return "Trending";
    }
    case "newest": {
      return "Newest";
    }
    case "stars": {
      return "Stars";
    }
    case "updated": {
      return "Updated";
    }
    case "views": {
      return "Views";
    }
    default: {
      return "Installs";
    }
  }
};
