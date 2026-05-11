import { renderContentAsync } from "@/lib/markdown";
import { m } from "@/paraglide/messages";
import type { Locale } from "@/paraglide/runtime";
import type { BrowseSort } from "@/utils/browse";
import { formatFileSize } from "@/utils/format";
import { buildSnapshotLineDiff } from "@/utils/skill-diff";
import { sumDailyMetrics } from "@/utils/stats";
import { buildFileTreeRows } from "@/view-models/build-file-tree-rows";
import { splitLegacyReviewContent } from "@/view-models/split-legacy-review-content";
import type { AppRouterClient } from "@skills-re/api";
import { parseSkillMarkdownDocument } from "@skills-re/utils";

interface SnapshotRecord {
  description: string;
  entryPath: string;
  hash: string;
  id: string;
  sourceCommitDate?: number | null;
  sourceCommitMessage?: string | null;
  syncTime: number;
  version: string;
}

export const resolveSnapshot = (snapshots: SnapshotRecord[], snapshotId?: string | null) => {
  if (!snapshotId) {
    return snapshots[0] ?? null;
  }

  return (
    snapshots.find((snapshot) => snapshot.id === snapshotId) ??
    snapshots.find((snapshot) => snapshot.version === snapshotId) ??
    snapshots[0] ??
    null
  );
};

interface ResolvePathSkillClient {
  skills: Pick<AppRouterClient["skills"], "resolvePathBySlug" | "getByPath">;
}

export const resolveSkillBase = async (input: { client: ResolvePathSkillClient; slug: string }) => {
  const path = await input.client.skills.resolvePathBySlug({ slug: input.slug });
  if (!path) {
    return null;
  }
  const skill = await input.client.skills.getByPath({
    authorHandle: path.authorHandle,
    repoName: path.repoName,
    skillSlug: path.skillSlug,
  });
  if (!skill) {
    return null;
  }
  return {
    description: skill.description,
    id: skill.id,
    latestVersion: skill.latestVersion ?? null,
    title: skill.title,
  };
};

export const fetchSkillBase = async (input: {
  client: ResolvePathSkillClient;
  skillSlug: string;
}) => {
  const path = await input.client.skills.resolvePathBySlug({ slug: input.skillSlug });

  if (!path) {
    return null;
  }

  const skill = await input.client.skills.getByPath({
    authorHandle: path.authorHandle,
    repoName: path.repoName,
    skillSlug: path.skillSlug,
  });
  if (!skill) {
    return null;
  }
  return {
    skill: {
      ...skill,
      authorHandle: path.authorHandle,
      repoName: path.repoName,
    },
  };
};

interface SkillAuditClient {
  staticAudits: Pick<AppRouterClient["staticAudits"], "getReportBySnapshot">;
}

export const fetchSkillAuditReport = async (input: {
  client: SkillAuditClient;
  snapshotId: string;
}) => await input.client.staticAudits.getReportBySnapshot({ snapshotId: input.snapshotId });

interface SkillCheckSavedClient {
  skills: Pick<AppRouterClient["skills"], "checkSaved">;
}

export const fetchSkillCheckSaved = async (input: {
  client: SkillCheckSavedClient;
  slug: string;
}) => await input.client.skills.checkSaved({ slug: input.slug });

interface SkillSaveClient {
  skills: Pick<AppRouterClient["skills"], "save" | "unsave">;
}

export const saveSkillToDashboard = async (input: { client: SkillSaveClient; slug: string }) =>
  await input.client.skills.save({ slug: input.slug });

export const unsaveSkillFromDashboard = async (input: { client: SkillSaveClient; slug: string }) =>
  await input.client.skills.unsave({ slug: input.slug });

interface SkillChangelogClient extends ResolvePathSkillClient {
  snapshots: Pick<AppRouterClient["snapshots"], "listBySkill">;
}

export const fetchSkillChangelog = async (input: {
  client: SkillChangelogClient;
  selectedSnapshotId?: string;
  skillSlug: string;
}) => {
  const { client } = input;
  const skill = await resolveSkillBase({ client, slug: input.skillSlug });

  if (!skill) {
    return null;
  }

  const snapshotsResult = await client.snapshots.listBySkill({ skillId: skill.id, limit: 3 });
  const snapshots = snapshotsResult.page;
  const currentSnapshot = resolveSnapshot(snapshots, input.selectedSnapshotId);

  return {
    entries: snapshots.map((snapshot, index) => ({
      body: snapshot.description,
      date: snapshot.sourceCommitDate ?? snapshot.syncTime,
      isCurrent: snapshot.id === currentSnapshot?.id || (!input.selectedSnapshotId && index === 0),
      shaLabel: snapshot.hash.slice(0, 7),
      title: snapshot.sourceCommitMessage?.trim() || snapshot.description,
      version: snapshot.version,
    })),
    skillDescription: skill.description,
    skillTitle: skill.title,
  };
};

interface SkillDocumentClient extends ResolvePathSkillClient {
  snapshots: Pick<AppRouterClient["snapshots"], "readSnapshotFileContent" | "listBySkill">;
}

export const fetchSkillDocument = async (input: {
  client: SkillDocumentClient;
  locale: Locale;
  selectedSnapshotId?: string;
  skillSlug: string;
}) => {
  const { client } = input;
  const skill = await resolveSkillBase({ client, slug: input.skillSlug });

  if (!skill) {
    return null;
  }

  const snapshotsResult = await client.snapshots.listBySkill({ limit: 3, skillId: skill.id });
  const snapshots = snapshotsResult.page;

  const snapshot = resolveSnapshot(snapshots, input.selectedSnapshotId);

  if (!snapshot) {
    return {
      contentHtml: "",
      entryMetaLabel: "Snapshot content unavailable",
      frontmatter: null,
      tocItems: [],
    };
  }

  const content = await client.snapshots.readSnapshotFileContent({
    maxBytes: 200_000,
    path: snapshot.entryPath,
    snapshotId: snapshot.id,
  });

  const parsed = parseSkillMarkdownDocument(content.content);

  return {
    contentHtml: await renderContentAsync({
      content: parsed.body,
      isMarkdown: true,
      path: snapshot.entryPath,
    }),
    entryMetaLabel: [
      snapshot.entryPath,
      formatFileSize(content.totalBytes),
      content.isTruncated ? m.skill_file_tree_content_truncated({ locale: input.locale }) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    frontmatter: parsed.frontmatter,
    tocItems: parsed.tocItems,
  };
};

interface SkillFileContentClient {
  snapshots: Pick<AppRouterClient["snapshots"], "readSnapshotFileContent">;
}

export const fetchSkillFileContent = async (input: {
  client: SkillFileContentClient;
  path: string;
  snapshotId: string;
}) => {
  const content = await input.client.snapshots.readSnapshotFileContent({
    maxBytes: 160_000,
    path: input.path,
    snapshotId: input.snapshotId,
  });

  return {
    html: await renderContentAsync({
      content: content.content,
      path: input.path,
    }),
    isTruncated: content.isTruncated,
    totalBytes: content.totalBytes,
  };
};

interface SkillFileTreeClient extends ResolvePathSkillClient {
  snapshots: Pick<AppRouterClient["snapshots"], "listBySkill" | "getSnapshotTreeEntries">;
}

export const fetchSKillFileTree = async (input: {
  client: SkillFileTreeClient;
  skillSlug: string;
  selectedSnapshotId?: string;
}) => {
  const { client } = input;
  const skill = await resolveSkillBase({ client, slug: input.skillSlug });

  if (!skill) {
    return null;
  }

  const snapshotsResult = await client.snapshots.listBySkill({ limit: 3, skillId: skill.id });
  const snapshots = snapshotsResult.page;
  const snapshot = resolveSnapshot(snapshots, input.selectedSnapshotId);

  if (!snapshot) {
    return {
      defaultActivePath: null,
      rows: [],
      skillDescription: skill.description,
      skillTitle: skill.title,
      snapshotId: null,
    };
  }

  const treeEntries = await client.snapshots.getSnapshotTreeEntries({
    snapshotId: snapshot.id,
  });

  const filePaths = treeEntries
    .map((entry) => entry.path)
    .toSorted((left, right) => left.localeCompare(right));

  const [firstPath] = filePaths;
  let defaultActivePath: string | undefined = firstPath;

  if (filePaths.includes("SKILL.md")) {
    defaultActivePath = "SKILL.md";
  } else if (filePaths.includes(snapshot.entryPath)) {
    defaultActivePath = snapshot.entryPath;
  }
  return {
    defaultActivePath: defaultActivePath ?? null,
    rows: buildFileTreeRows(treeEntries, defaultActivePath ?? ""),
    skillDescription: skill.description,
    skillTitle: skill.title,
    snapshotId: snapshot.id,
  };
};

interface SkillVersionHistoryClient {
  snapshots: Pick<AppRouterClient["snapshots"], "listBySkill">;
}

export const fetchSkillVersionHistory = async (input: {
  client: SkillVersionHistoryClient;
  skillId: string;
}) => {
  const result = await input.client.snapshots.listBySkill({ limit: 3, skillId: input.skillId });

  return result.page.map((snapshot, index) => ({
    date: snapshot.sourceCommitDate ?? snapshot.syncTime,
    entryPath: snapshot.entryPath,
    label: index === 0 ? "current" : undefined,
    snapshotId: snapshot.id,
    version: snapshot.version,
  }));
};

interface SkillDownloadMetricsClient {
  metrics: Pick<AppRouterClient["metrics"], "getSkillDownloadMetrics">;
}

export const fetchSkillDownloadMetrics = async (input: {
  client: SkillDownloadMetricsClient;
  skillId: string;
}) =>
  await input.client.metrics.getSkillDownloadMetrics({
    skillId: input.skillId,
  });

interface SkillReviewsInitialClient extends ResolvePathSkillClient {
  reviews: Pick<AppRouterClient["reviews"], "statsBySkill" | "listBySkill">;
}

export const fetchSkillReviewsInitial = async (input: {
  client: SkillReviewsInitialClient;
  skillSlug: string;
}) => {
  const { client } = input;
  const skill = await resolveSkillBase({ client, slug: input.skillSlug });

  if (!skill) {
    return null;
  }

  const [stats, firstPage] = await Promise.all([
    client.reviews.statsBySkill({ skillId: skill.id }),
    client.reviews.listBySkill({ limit: 10, skillId: skill.id }),
  ]);

  return {
    nextCursor: firstPage.nextCursor ?? null,
    ratingAvg: stats.ratingAvg,
    ratingCounts: ([5, 4, 3, 2, 1] as const).map((stars) => ({
      count: stats.ratingCounts[stars],
      stars,
    })),
    recommendPct: stats.recommendPct,
    reviews: firstPage.items.map((review) => {
      const normalizedReview = splitLegacyReviewContent(review.content, review.title);
      return {
        authorName: review.author.name,
        body: normalizedReview.body,
        createdAt: review.createdAt,
        id: review.id,
        stars: review.rating,
        title: normalizedReview.title,
        versionLabel: skill.latestVersion ? `v${skill.latestVersion}` : undefined,
      };
    }),
    skillDescription: skill.description,
    skillId: skill.id,
    skillTitle: skill.title,
    totalReviews: stats.totalReviews,
  };
};

interface SkillReviewsPaginationClient extends ResolvePathSkillClient {
  reviews: Pick<AppRouterClient["reviews"], "listBySkill">;
}

export const fetchSkillReviewsPagination = async (input: {
  client: SkillReviewsPaginationClient;
  cursor?: string;
  skillSlug: string;
}) => {
  const { client } = input;
  const skill = await resolveSkillBase({ client, slug: input.skillSlug });

  if (!skill) {
    return { nextCursor: null, reviews: [] };
  }

  const result = await client.reviews.listBySkill({
    cursor: input.cursor,
    limit: 10,
    skillId: skill.id,
  });

  return {
    nextCursor: result.nextCursor ?? null,
    reviews: result.items.map((review) => {
      const normalizedReview = splitLegacyReviewContent(review.content, review.title);
      return {
        authorName: review.author.name,
        body: normalizedReview.body,
        createdAt: review.createdAt,
        id: review.id,
        stars: review.rating,
        title: normalizedReview.title,
        versionLabel: skill.latestVersion ? `v${skill.latestVersion}` : undefined,
      };
    }),
  };
};

interface SkillSnapshotDiffClient {
  snapshots: Pick<AppRouterClient["snapshots"], "listBySkill" | "readSnapshotFileContent">;
}

export const fetchSkillSnapshotDiff = async (input: {
  client: SkillSnapshotDiffClient;
  baseSnapshotId: string;
  compareSnapshotId: string;
  skillId: string;
}) => {
  const base = await input.client.snapshots.listBySkill({ limit: 3, skillId: input.skillId });

  const baseSnapshot = resolveSnapshot(base.page, input.baseSnapshotId);
  const compareSnapshot = resolveSnapshot(base.page, input.compareSnapshotId);
  if (!baseSnapshot || !compareSnapshot) {
    return null;
  }

  const [baseContent, compareContent] = await Promise.all([
    input.client.snapshots.readSnapshotFileContent({
      maxBytes: 200_000,
      path: baseSnapshot.entryPath,
      snapshotId: baseSnapshot.id,
    }),
    input.client.snapshots.readSnapshotFileContent({
      maxBytes: 200_000,
      path: compareSnapshot.entryPath,
      snapshotId: compareSnapshot.id,
    }),
  ]);

  const baseDocument = parseSkillMarkdownDocument(baseContent.content);
  const compareDocument = parseSkillMarkdownDocument(compareContent.content);
  const baseText = baseDocument.body || baseContent.content;
  const compareText = compareDocument.body || compareContent.content;

  const diff = buildSnapshotLineDiff(baseText, compareText);

  return { lines: diff.lines, summary: diff.summary };
};

interface SkillViewMetricsClient {
  metrics: Pick<AppRouterClient["metrics"], "getSkillViewMetrics" | "recordSkillView">;
}

export const fetchSkillViewMetrics = async (input: {
  client: SkillViewMetricsClient;
  skillId: string;
}) =>
  await input.client.metrics.getSkillViewMetrics({
    skillId: input.skillId,
  });

export const updateSkillViewMetrics = async (input: {
  client: SkillViewMetricsClient;
  skillId: string;
  path?: string;
}) =>
  await input.client.metrics.recordSkillView({
    skillId: input.skillId,
    path: input.path,
  });

// ----

export interface SkillsBrowseFilters {
  category?: string;
  q?: string;
  sort?: BrowseSort;
  tag?: string[];
  cursor?: string;
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

export interface SkillsBrowseMetaClient {
  categories: Pick<AppRouterClient["categories"], "list">;
  metrics: Pick<AppRouterClient["metrics"], "dailySkillsSnapshots">;
  skills: Pick<AppRouterClient["skills"], "count">;
  tags: Pick<AppRouterClient["tags"], "listIndexable">;
}

export interface SkillsBrowsePageSlice {
  continueCursor: string;
  isDone: boolean;
  page: Awaited<ReturnType<AppRouterClient["skills"]["search"]>>["page"];
}

interface SkillsBrowsePaginationClient {
  skills: Pick<AppRouterClient["skills"], "search">;
}

export interface NormalizedSkillsBrowseFilters {
  activeClass: string;
  query: string;
  sort: BrowseSort;
  tags: string[];
}

export const normalizeSkillsBrowseFilters = (
  input: Pick<SkillsBrowseFilters, "category" | "q" | "sort" | "tag">,
): NormalizedSkillsBrowseFilters => {
  const activeClass = input.category?.trim() || "all";
  const tags = [...new Set((input.tag ?? []).map((tag) => tag.trim()).filter(Boolean))].toSorted();

  return {
    activeClass,
    query: input.q?.trim() ?? "",
    sort: input.sort ?? "downloads-all-time",
    tags,
  };
};

export const fetchSkillsBrowseMeta = async (
  input: Pick<SkillsBrowseFilters, "category" | "q" | "sort" | "tag"> & {
    client: SkillsBrowseMetaClient;
  },
) => {
  const { client } = input;
  const filters = normalizeSkillsBrowseFilters(input);

  const [categoryRecords, tagRecords, skillsCount, dailyMetrics] = await Promise.all([
    client.categories.list({ all: true, limit: 100 }),
    client.tags.listIndexable({ limit: 40 }),
    client.skills.count(),
    client.metrics.dailySkillsSnapshots({ limit: 30 }),
  ]);

  const totals = sumDailyMetrics(dailyMetrics);
  const activeFilters = (filters.activeClass === "all" ? 0 : 1) + filters.tags.length;

  return {
    categories: categoryRecords,
    counts: {
      activeFilters,
      categories: categoryRecords.length,
      newSkills30d: totals.newSkills,
      skills: skillsCount,
    },
    tags: tagRecords,
  };
};

export const fetchSkillsBrowseInitialPage = async (
  input: Pick<SkillsBrowseFilters, "category" | "q" | "sort" | "tag"> & {
    client: SkillsBrowsePaginationClient;
  },
) => await fetchSkillsBrowsePagination(input);

export const SKILLS_BROWSE_PAGE_SIZE = 24;

export const fetchSkillsBrowsePagination = async (
  input: Pick<SkillsBrowseFilters, "category" | "q" | "sort" | "tag" | "cursor"> & {
    client: SkillsBrowsePaginationClient;
  },
) => {
  const { client } = input;
  const filters = normalizeSkillsBrowseFilters(input);

  const searchResult = await client.skills.search({
    categories: filters.activeClass === "all" ? undefined : [filters.activeClass],
    cursor: input.cursor,
    limit: SKILLS_BROWSE_PAGE_SIZE,
    sort: filters.sort,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
  });

  return {
    continueCursor: searchResult.continueCursor,
    isDone: searchResult.isDone,
    page: searchResult.page,
  };
};
