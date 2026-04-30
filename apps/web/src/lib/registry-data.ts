import {
  getCategoryDescription,
  getCategoryLabel,
  getCategoryPresentation,
} from "./category-taxonomy";

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
  id: string;
  name: string;
  slug: string;
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

export interface DailyMetricPoint {
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

const getAuthorLabel = (skill: SearchSkillListItem) =>
  skill.author?.name ?? skill.authorHandle ?? skill.author?.handle ?? "Unknown author";

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

export const getLiveStats = (input: {
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

export { getCategoryPresentation };

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
    description: getCategoryDescription(category.slug),
    id: category.slug,
    num: presentation.num,
    skillCount: category.count,
    title: getCategoryLabel(category.slug),
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
    title: getCategoryLabel(category.slug),
  };
};

export const toSkillCardItem = (skill: SearchSkillListItem): SkillCardItem => ({
  auditScore: skill.staticAudit?.overallScore,
  authorLabel: getAuthorLabel(skill),
  badgeLabel: skill.latestVersion ? `v${skill.latestVersion}` : undefined,
  categoryLabel: skill.primaryCategory
    ? getCategoryLabel(skill.primaryCategory)
    : getCategoryLabel("other"),
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
