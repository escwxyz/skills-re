import type { AppRouterClient } from "@skills-re/api/routers/index";

interface SearchSkillListItem {
  author?: {
    githubUrl?: string;
    handle?: string;
    name?: string | null;
  };
  authorHandle?: string;
  description: string;
  downloadsAllTime?: number;
  downloadsTrending?: number;
  id: string;
  latestVersion?: string;
  primaryCategory?: string;
  slug: string;
  staticAudit?: {
    isBlocked?: boolean;
    overallScore: number;
    riskLevel?: "safe" | "low" | "medium" | "high" | "critical";
    safeToPublish?: boolean;
    status?: "pass" | "fail";
    summary?: string;
    syncTime?: number;
  } | null;
  stargazerCount?: number;
  tags?: string[];
  title: string;
}

interface CategoryListItem {
  count: number;
  description: string;
  id: string;
  name: string;
  slug: string;
}

interface CategoryDetail {
  count: number;
  description: string;
  name: string;
  relatedTags: {
    count: number;
    slug: string;
  }[];
  slug: string;
  topSkills: SearchSkillListItem[];
}

interface AuthorListItem {
  avatarUrl?: string | null;
  githubUrl: string;
  handle: string;
  isVerified?: boolean;
  name?: string | null;
  repoCount: number;
  skillCount: number;
}

interface DailyMetricPoint {
  day: string;
  newSkills: number;
  newSnapshots: number;
  updatedAtMs: number;
}

export interface StatStripItem {
  accent?: "green" | "blue" | "red";
  label: string;
  value: string;
}

export interface CategoryCardItem {
  description: string;
  id: string;
  num: string;
  passRate?: string;
  skillCount: number;
  title: string;
  variant?: "default" | "accent" | "blue" | "green" | "italic";
}

export interface SkillCardItem {
  auditScore?: number;
  authorLabel: string;
  badgeLabel?: string;
  categoryLabel: string;
  description: string;
  id: string;
  slug: string;
  starsLabel?: string;
  tags: string[];
  title: string;
}

export type BrowseSort =
  | "newest"
  | "updated"
  | "views"
  | "downloads-trending"
  | "downloads-all-time"
  | "stars";

export const DEFAULT_BROWSE_SORT: BrowseSort = "downloads-all-time";
export const SKILLS_BROWSE_PAGE_SIZE = 24;

const SORT_SEQUENCE: BrowseSort[] = [
  "downloads-all-time",
  "downloads-trending",
  "newest",
  "updated",
  "stars",
  "views",
];

export const buildBrowseUrl = (filters: SkillsBrowseFilters): string => {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.activeClass !== "all") params.set("category", filters.activeClass);
  for (const tag of filters.tags) params.append("tag", tag);
  if (filters.sort !== DEFAULT_BROWSE_SORT) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  const qs = params.toString();
  return qs ? `/skills?${qs}` : "/skills";
};

export const getNextBrowseSort = (current: BrowseSort): BrowseSort => {
  const idx = SORT_SEQUENCE.indexOf(current);
  return idx === -1 ? DEFAULT_BROWSE_SORT : SORT_SEQUENCE[(idx + 1) % SORT_SEQUENCE.length];
};

export interface BrowseCategoryItem {
  count: number;
  countLabel: string;
  id: string;
  num: string;
  title: string;
}

export interface BrowseTagItem {
  count: number;
  countLabel: string;
  slug: string;
}

export interface BrowseSkillItem extends SkillCardItem {
  downloadsLabel: string;
  latestVersionLabel: string;
}

export interface SkillsBrowseFilters {
  activeClass: string;
  page: number;
  query: string;
  sort: BrowseSort;
  tags: string[];
}

export interface FeaturedPickItem {
  description: string;
  id: string;
  installsLabel: string;
  slug: string;
  title: string;
  versionLabel: string;
}

export interface RegistryHomeData {
  categories: CategoryCardItem[];
  featuredPicks: FeaturedPickItem[];
  metaStripItems: StatStripItem[];
  numbersStripItems: StatStripItem[];
  totalSkillsLabel: string;
}

export interface CategoriesIndexData {
  categories: CategoryCardItem[];
  stats: StatStripItem[];
}

export interface CategoryDetailData {
  category: CategoryCardItem;
  otherCategories: CategoryCardItem[];
  relatedTags: CategoryDetail["relatedTags"];
  topSkills: SkillCardItem[];
}

export interface SkillsBrowseData {
  categories: BrowseCategoryItem[];
  filters: SkillsBrowseFilters;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: BrowseSkillItem[];
  rangeEnd: number;
  rangeStart: number;
  stats: StatStripItem[];
  tags: BrowseTagItem[];
  totalSkillsLabel: string;
}

const CATEGORY_PRESENTATION: Record<string, Pick<CategoryCardItem, "num" | "variant">> = {
  browsing: { num: "05", variant: "italic" },
  "code-craft": { num: "01", variant: "default" },
  data: { num: "03", variant: "default" },
  design: { num: "07", variant: "default" },
  ops: { num: "06", variant: "green" },
  research: { num: "02", variant: "accent" },
  safety: { num: "08", variant: "accent" },
  writing: { num: "04", variant: "blue" },
};

const INTEGER_FORMATTER = new Intl.NumberFormat("en-US");
const COMPACT_INTEGER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});
const VALID_BROWSE_SORTS = new Set<BrowseSort>([
  "downloads-all-time",
  "downloads-trending",
  "newest",
  "stars",
  "updated",
  "views",
]);

const getCategoryPresentation = (slug: string, index: number) =>
  CATEGORY_PRESENTATION[slug] ?? {
    num: String(index + 1).padStart(2, "0"),
    variant: "default" as const,
  };

const getAuthorLabel = (skill: SearchSkillListItem) =>
  skill.author?.name ?? skill.authorHandle ?? skill.author?.handle ?? "Unknown author";

const getBrowseSort = (value: string | null): BrowseSort =>
  value && VALID_BROWSE_SORTS.has(value as BrowseSort)
    ? (value as BrowseSort)
    : DEFAULT_BROWSE_SORT;

const parsePageNumber = (value: string | null) => {
  if (!value) {
    return 1;
  }

  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
};

const encodeSearchOffsetCursor = (offset: number) =>
  btoa(JSON.stringify({ offset })).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const getLiveStats = (input: {
  authors: AuthorListItem[];
  categoryCount: number;
  dailyMetrics: DailyMetricPoint[];
  skillsCount: number;
}) => {
  const totals = sumDailyMetrics(input.dailyMetrics);
  const authorsCountLabel = formatInteger(input.authors.length);
  const categoriesCountLabel = formatInteger(input.categoryCount);
  const skillsCountLabel = formatInteger(input.skillsCount);
  const newSkills30dLabel = formatInteger(totals.newSkills);
  const newSnapshots30dLabel = formatInteger(totals.newSnapshots);

  return {
    authorsCountLabel,
    categoriesCountLabel,
    metaStripItems: [
      { label: "Skills Indexed", value: skillsCountLabel },
      { label: "Authors", value: authorsCountLabel },
      { label: "Categories", value: categoriesCountLabel },
      { label: "New Skills (30d)", value: newSkills30dLabel },
      { label: "New Snapshots (30d)", value: newSnapshots30dLabel },
    ] satisfies StatStripItem[],
    newSkills30dLabel,
    newSnapshots30dLabel,
    numbersStripItems: [
      { label: "Skills in the Index", value: skillsCountLabel },
      { label: "Listed Authors", value: authorsCountLabel },
      { label: "New Skills (30d)", value: newSkills30dLabel },
      { label: "New Snapshots (30d)", value: newSnapshots30dLabel },
    ] satisfies StatStripItem[],
    skillsCountLabel,
  };
};

export const formatInteger = (value: number) => INTEGER_FORMATTER.format(value);

export const formatCompactNumber = (value: number) => COMPACT_INTEGER_FORMATTER.format(value);

export const sumDailyMetrics = (points: DailyMetricPoint[]) => {
  const totals = {
    newSkills: 0,
    newSnapshots: 0,
  };

  for (const point of points) {
    totals.newSkills += point.newSkills;
    totals.newSnapshots += point.newSnapshots;
  }

  return totals;
};

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

export const toCategoryCardItem = (category: CategoryListItem, index: number): CategoryCardItem => {
  const presentation = getCategoryPresentation(category.slug, index);

  return {
    description: category.description,
    id: category.slug,
    num: presentation.num,
    skillCount: category.count,
    title: category.name,
    variant: presentation.variant,
  };
};

export const toBrowseCategoryItem = (
  category: CategoryListItem,
  index: number,
): BrowseCategoryItem => {
  const presentation = getCategoryPresentation(category.slug, index);

  return {
    count: category.count,
    countLabel: formatInteger(category.count),
    id: category.slug,
    num: presentation.num,
    title: category.name,
  };
};

export const toSkillCardItem = (skill: SearchSkillListItem): SkillCardItem => ({
  auditScore: skill.staticAudit?.overallScore,
  authorLabel: getAuthorLabel(skill),
  badgeLabel: skill.latestVersion ? `v${skill.latestVersion}` : undefined,
  categoryLabel: skill.primaryCategory ?? "Uncategorized",
  description: skill.description,
  id: skill.id,
  slug: skill.slug,
  starsLabel:
    skill.stargazerCount === undefined ? undefined : formatCompactNumber(skill.stargazerCount),
  tags: skill.tags ?? [],
  title: skill.title,
});

export const toBrowseSkillItem = (skill: SearchSkillListItem): BrowseSkillItem => ({
  ...toSkillCardItem(skill),
  downloadsLabel: formatCompactNumber(skill.downloadsAllTime ?? 0),
  latestVersionLabel: skill.latestVersion ? `v${skill.latestVersion}` : "latest",
});

export const toBrowseTagItem = (tag: { count: number; slug: string }): BrowseTagItem => ({
  count: tag.count,
  countLabel: formatInteger(tag.count),
  slug: tag.slug,
});

export const toFeaturedPickItem = (skill: SearchSkillListItem): FeaturedPickItem => ({
  description: skill.description,
  id: skill.id,
  installsLabel: formatCompactNumber(skill.downloadsAllTime ?? 0),
  slug: skill.slug,
  title: skill.title,
  versionLabel: skill.latestVersion ? `v${skill.latestVersion}` : "latest",
});

export const getRegistryHomeData = async (client: AppRouterClient): Promise<RegistryHomeData> => {
  const [authors, categories, categoryCount, dailyMetrics, featuredSkills, skillsCount] =
    await Promise.all([
      client.skills.listAuthors(),
      client.categories.list({ limit: 8 }),
      client.categories.count(),
      client.metrics.dailySkillsSnapshots({ limit: 30 }),
      client.skills.search({ limit: 5, sort: "downloads-all-time" }),
      client.skills.count(),
    ]);

  const liveStats = getLiveStats({
    authors,
    categoryCount,
    dailyMetrics,
    skillsCount,
  });

  return {
    categories: categories.map((category, index) => toCategoryCardItem(category, index)),
    featuredPicks: featuredSkills.page.map(toFeaturedPickItem),
    metaStripItems: liveStats.metaStripItems,
    numbersStripItems: liveStats.numbersStripItems,
    totalSkillsLabel: liveStats.skillsCountLabel,
  };
};

export const getCategoriesIndexData = async (
  client: AppRouterClient,
): Promise<CategoriesIndexData> => {
  const [authors, categories, categoryCount, dailyMetrics, skillsCount] = await Promise.all([
    client.skills.listAuthors(),
    client.categories.list({ all: true, limit: 100 }),
    client.categories.count(),
    client.metrics.dailySkillsSnapshots({ limit: 30 }),
    client.skills.count(),
  ]);

  const liveStats = getLiveStats({
    authors,
    categoryCount,
    dailyMetrics,
    skillsCount,
  });

  return {
    categories: categories.map((category, index) => toCategoryCardItem(category, index)),
    stats: [
      { label: "Disciplines", value: liveStats.categoriesCountLabel },
      { label: "Skills Indexed", value: liveStats.skillsCountLabel },
      { label: "Listed Authors", value: liveStats.authorsCountLabel },
      { label: "New Skills (30d)", value: liveStats.newSkills30dLabel },
    ],
  };
};

export const getCategoryDetailData = async (
  client: AppRouterClient,
  slug: string,
): Promise<CategoryDetailData | null> => {
  const [categoryDetail, categories] = await Promise.all([
    client.categories.getBySlug({ slug }),
    client.categories.list({ all: true, limit: 100 }),
  ]);

  if (!categoryDetail) {
    return null;
  }

  const categoryCards = categories.map((category, index) => toCategoryCardItem(category, index));
  const currentCategory = categoryCards.find((category) => category.id === categoryDetail.slug) ?? {
    description: categoryDetail.description,
    id: categoryDetail.slug,
    num: getCategoryPresentation(categoryDetail.slug, categoryCards.length).num,
    skillCount: categoryDetail.count,
    title: categoryDetail.name,
    variant: getCategoryPresentation(categoryDetail.slug, categoryCards.length).variant,
  };

  return {
    category: {
      ...currentCategory,
      description: categoryDetail.description,
      skillCount: categoryDetail.count,
      title: categoryDetail.name,
    },
    otherCategories: categoryCards.filter((category) => category.id !== categoryDetail.slug),
    relatedTags: categoryDetail.relatedTags,
    topSkills: categoryDetail.topSkills.map(toSkillCardItem),
  };
};

export const getSkillsBrowseData = async (
  client: AppRouterClient,
  searchParams: URLSearchParams,
): Promise<SkillsBrowseData> => {
  const query = searchParams.get("q")?.trim() ?? "";
  const activeClass = searchParams.get("category")?.trim() || "all";
  const tags = [
    ...new Set(
      searchParams
        .getAll("tag")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
  const sort = getBrowseSort(searchParams.get("sort"));
  const page = parsePageNumber(searchParams.get("page"));
  const cursor =
    page > 1 ? encodeSearchOffsetCursor((page - 1) * SKILLS_BROWSE_PAGE_SIZE) : undefined;

  const [categories, dailyMetrics, searchResult, skillsCount, tagList] = await Promise.all([
    client.categories.list({ all: true, limit: 100 }),
    client.metrics.dailySkillsSnapshots({ limit: 30 }),
    client.skills.search({
      categories: activeClass === "all" ? undefined : [activeClass],
      cursor,
      limit: SKILLS_BROWSE_PAGE_SIZE,
      query: query || undefined,
      sort,
      tags: tags.length > 0 ? tags : undefined,
    }),
    client.skills.count(),
    client.tags.listIndexable({ limit: 40 }),
  ]);

  const totals = sumDailyMetrics(dailyMetrics);
  const activeFilterCount = (query ? 1 : 0) + (activeClass === "all" ? 0 : 1) + tags.length;
  const rangeStart = searchResult.page.length > 0 ? (page - 1) * SKILLS_BROWSE_PAGE_SIZE + 1 : 0;
  const rangeEnd = searchResult.page.length > 0 ? rangeStart + searchResult.page.length - 1 : 0;

  return {
    categories: categories.map((category, index) => toBrowseCategoryItem(category, index)),
    filters: {
      activeClass,
      page,
      query,
      sort,
      tags,
    },
    hasNextPage: !searchResult.isDone,
    hasPreviousPage: page > 1,
    items: searchResult.page.map(toBrowseSkillItem),
    rangeEnd,
    rangeStart,
    stats: [
      { label: "Skills", value: formatInteger(skillsCount) },
      { label: "Categories", value: formatInteger(categories.length) },
      { label: "New Skills / 30d", value: formatInteger(totals.newSkills) },
      { label: "Active Filters", value: formatInteger(activeFilterCount) },
    ],
    tags: tagList.map(toBrowseTagItem),
    totalSkillsLabel: formatInteger(skillsCount),
  };
};
