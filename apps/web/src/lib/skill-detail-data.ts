// oxlint-disable no-nested-ternary
import type { AppRouterClient } from "@skills-re/api/routers/index";

import { renderContentAsync, renderMarkdownAsync } from "./markdown";
import { formatCompactNumber, formatInteger } from "./registry-data";

interface SkillPathRecord {
  authorHandle?: string;
  repoName?: string;
  skillSlug: string;
}

interface SearchSkillListItem {
  author?: {
    githubUrl?: string;
    handle?: string;
    name?: string | null;
  };
  authorHandle?: string;
  createdAt?: number;
  description: string;
  downloadsAllTime?: number;
  downloadsTrending?: number;
  forkCount?: number;
  id: string;
  isVerified?: boolean;
  latestVersion?: string;
  license?: string;
  primaryCategory?: string;
  repoName?: string;
  repoUrl?: string;
  slug: string;
  stargazerCount?: number;
  staticAudit?: {
    overallScore: number;
  } | null;
  syncTime?: number;
  tags?: string[];
  title: string;
  updatedAt?: number;
  viewsAllTime?: number;
}

interface SnapshotItem {
  description: string;
  entryPath: string;
  hash: string;
  id: string;
  sourceCommitDate?: number | null;
  sourceCommitMessage?: string | null;
  syncTime: number;
  version: string;
}

interface ReviewItem {
  author: {
    avatarUrl: string | null;
    name: string;
  };
  content: string;
  createdAt: number;
  id: string;
  rating: number;
  skillId: string;
  updatedAt: number;
  userId: string;
}

interface SnapshotTreeEntry {
  path: string;
  size?: number;
  type: "blob";
}

interface SnapshotFileContent {
  bytesRead: number;
  content: string;
  isTruncated: boolean;
  offset: number;
  totalBytes: number;
}

interface SkillBaseRecord {
  latestSnapshot: SnapshotItem | null;
  layout: SkillLayoutData;
  relatedSkills: SkillRelatedItem[];
  skill: SearchSkillListItem;
  snapshots: SnapshotItem[];
}

export interface SkillMetaItem {
  href?: string;
  label: string;
  mono?: boolean;
  value: string;
}

export interface SkillMetricItem {
  label: string;
  value: string;
}

export interface SkillVersionHistoryItem {
  date: string;
  label?: string;
  version: string;
}

export interface SkillSwitcherItem {
  slug: string;
  title: string;
}

export interface SkillLayoutData {
  authorHandle: string;
  authorLabel: string;
  authorSkills: SkillSwitcherItem[];
  categoryLabel: string;
  description: string;
  id: string;
  isVerified: boolean;
  metaItems: SkillMetaItem[];
  metricItems: SkillMetricItem[];
  reviewTabLabel: string;
  slug: string;
  tags: string[];
  title: string;
  versionHistory: SkillVersionHistoryItem[];
}

export interface SkillFrontmatterData {
  allowedTools?: string;
  compatibility?: string;
  description?: string;
  license?: string;
  metadata?: Record<string, string>;
  name?: string;
}

export interface SkillRelatedItem {
  description: string;
  id: string;
  slug: string;
  title: string;
  versionLabel: string;
}

export interface SkillDocumentPageData {
  contentHtml: string;
  entryMetaLabel: string;
  frontmatter: SkillFrontmatterData | null;
  layout: SkillLayoutData;
  relatedSkills: SkillRelatedItem[];
  tocItems: string[];
}

export interface SkillReviewCardData {
  authorName: string;
  bodyHtml: string;
  dateLabel: string;
  id: string;
  isLast?: boolean;
  stars: number;
  versionLabel?: string;
}

export interface SkillReviewsPageData {
  layout: SkillLayoutData;
  ratingAvg: number;
  ratingCounts: {
    count: number;
    stars: number;
  }[];
  recommendPct: number;
  reviews: SkillReviewCardData[];
  totalReviews: number;
}

export interface SkillChangelogEntry {
  body: string;
  dateLabel: string;
  isCurrent: boolean;
  shaLabel?: string;
  title: string;
  version: string;
}

export interface SkillChangelogPageData {
  entries: SkillChangelogEntry[];
  layout: SkillLayoutData;
}

export interface SkillFileTreeRow {
  depth: number;
  isActive: boolean;
  name: string;
  path: string;
  size?: number;
  type: "file" | "folder";
}

export interface SkillFileTreeSelection {
  html: string;
  isTruncated: boolean;
  metaLabel: string;
  path: string;
}

export interface SkillFileTreePageData {
  activeFile: SkillFileTreeSelection | null;
  layout: SkillLayoutData;
  rows: SkillFileTreeRow[];
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const getAuthorLabel = (skill: SearchSkillListItem, authorHandle: string) =>
  skill.author?.name ?? skill.author?.handle ?? skill.authorHandle ?? authorHandle;

const formatDateLabel = (value?: number | null) =>
  typeof value === "number" ? DATE_FORMATTER.format(new Date(value)) : undefined;

const formatOptionalCompactNumber = (value?: number) =>
  typeof value === "number" ? formatCompactNumber(value) : "—";

const getRepositoryLabel = (path: SkillPathRecord) =>
  path.repoName ? `${path.authorHandle}/${path.repoName}` : path.authorHandle;

const normalizeFrontmatterKey = (value: string) => value.trim().toLowerCase().replaceAll("_", "-");

const stripWrappingQuotes = (value: string) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const toJoinedValue = (value: string | string[] | undefined) => {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value;
};

const readFrontmatterValue = (
  values: Record<string, string | string[] | undefined>,
  ...keys: string[]
) => {
  for (const key of keys) {
    const resolved = toJoinedValue(values[key]);
    if (resolved) {
      return resolved;
    }
  }
};

const parseSkillFrontmatter = (source: string): SkillFrontmatterData | null => {
  const values: Record<string, string | string[] | undefined> = {};
  const metadata: Record<string, string> = {};
  let currentKey: string | null = null;

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const topLevelMatch = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (topLevelMatch) {
      currentKey = normalizeFrontmatterKey(topLevelMatch[1]);
      const rawValue = topLevelMatch[2]?.trim() ?? "";
      if (rawValue) {
        values[currentKey] = stripWrappingQuotes(rawValue);
      } else if (currentKey !== "metadata") {
        values[currentKey] = [];
      }
      continue;
    }

    if (currentKey === "metadata" && /^[\t ]+/.test(line)) {
      const metadataMatch = trimmed.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
      if (metadataMatch) {
        metadata[metadataMatch[1]] = stripWrappingQuotes(metadataMatch[2].trim());
      }
      continue;
    }

    if (trimmed.startsWith("- ") && currentKey) {
      const existing = values[currentKey];
      const nextValue = stripWrappingQuotes(trimmed.slice(2).trim());
      values[currentKey] = Array.isArray(existing)
        ? [...existing, nextValue]
        : existing
          ? [existing, nextValue]
          : [nextValue];
    }
  }

  const result: SkillFrontmatterData = {
    allowedTools: readFrontmatterValue(values, "allowed-tools", "allowedtools"),
    compatibility: readFrontmatterValue(values, "compatibility"),
    description: readFrontmatterValue(values, "description"),
    license: readFrontmatterValue(values, "license"),
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    name: readFrontmatterValue(values, "name"),
  };

  return Object.values(result).some((value) => value !== undefined) ? result : null;
};

export const parseSkillMarkdownDocument = (source: string) => {
  const frontmatterMatch = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  const frontmatter = frontmatterMatch ? parseSkillFrontmatter(frontmatterMatch[1]) : null;
  const withoutFrontmatter = frontmatterMatch ? source.slice(frontmatterMatch[0].length) : source;
  const lines = withoutFrontmatter.split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);

  if (firstContentIndex !== -1 && /^#\s+/.test(lines[firstContentIndex])) {
    lines.splice(firstContentIndex, 1);
    if (lines[firstContentIndex]?.trim() === "") {
      lines.splice(firstContentIndex, 1);
    }
  }

  const body = lines.join("\n").trim();
  const tocItems = body
    .split(/\r?\n/)
    .map((line) => line.match(/^##+\s+(.+)$/)?.[1]?.trim())
    .filter((item): item is string => item !== undefined);

  return {
    body,
    frontmatter,
    tocItems,
  };
};

const buildSkillLayout = (input: {
  authorHandle: string;
  authorSkills: SkillSwitcherItem[];
  reviewTabLabel?: string;
  skill: SearchSkillListItem;
  snapshots: SnapshotItem[];
}) => {
  const latestSnapshot = input.snapshots[0] ?? null;
  const authorLabel = getAuthorLabel(input.skill, input.authorHandle);
  const categoryLabel = input.skill.primaryCategory ?? "Uncategorized";
  const publishedLabel = formatDateLabel(
    input.skill.createdAt ?? latestSnapshot?.sourceCommitDate ?? latestSnapshot?.syncTime,
  );
  const updatedLabel = formatDateLabel(
    input.skill.updatedAt ?? latestSnapshot?.syncTime ?? input.skill.syncTime,
  );
  const repoLabel = getRepositoryLabel({
    authorHandle: input.authorHandle,
    repoName: input.skill.repoName,
    skillSlug: input.skill.slug,
  });

  return {
    authorHandle: input.authorHandle,
    authorLabel,
    authorSkills: input.authorSkills,
    categoryLabel,
    description: input.skill.description,
    id: input.skill.id,
    isVerified: input.skill.isVerified ?? false,
    metaItems: (
      [
        {
          label: "Version",
          mono: true,
          value: input.skill.latestVersion ? `v${input.skill.latestVersion}` : "latest",
        },
        {
          label: "Author",
          value: authorLabel,
        },
        input.skill.license
          ? {
              label: "License",
              mono: true,
              value: input.skill.license,
            }
          : undefined,
        {
          label: "Category",
          value: categoryLabel,
        },
        repoLabel
          ? {
              href: input.skill.repoUrl,
              label: "Repository",
              mono: true,
              value: repoLabel,
            }
          : undefined,
        publishedLabel
          ? {
              label: "Published",
              value: publishedLabel,
            }
          : undefined,
        updatedLabel
          ? {
              label: "Updated",
              value: updatedLabel,
            }
          : undefined,
      ] as (SkillMetaItem | undefined)[]
    ).filter((item): item is SkillMetaItem => item !== undefined),
    metricItems: [
      {
        label: "Audit Score",
        value:
          typeof input.skill.staticAudit?.overallScore === "number"
            ? `${input.skill.staticAudit.overallScore}/100`
            : "—",
      },
      {
        label: "Installs",
        value: formatOptionalCompactNumber(input.skill.downloadsAllTime),
      },
      {
        label: "Stars",
        value: formatOptionalCompactNumber(input.skill.stargazerCount),
      },
      {
        label: "Latest Version",
        value: input.skill.latestVersion ? `v${input.skill.latestVersion}` : "latest",
      },
      {
        label: "Views",
        value: formatOptionalCompactNumber(input.skill.viewsAllTime),
      },
      {
        label: "Trending",
        value: formatOptionalCompactNumber(input.skill.downloadsTrending),
      },
      {
        label: "Forks",
        value: formatOptionalCompactNumber(input.skill.forkCount),
      },
    ],
    reviewTabLabel: input.reviewTabLabel ?? "Reviews",
    slug: input.skill.slug,
    tags: input.skill.tags ?? [],
    title: input.skill.title,
    versionHistory: input.snapshots.map((snapshot, index) => ({
      date: formatDateLabel(snapshot.sourceCommitDate ?? snapshot.syncTime) ?? "Unknown date",
      label: index === 0 ? "current" : undefined,
      version: snapshot.version,
    })),
  } satisfies SkillLayoutData;
};

const buildRelatedSkills = (input: {
  authorHandle: string;
  items: SearchSkillListItem[];
  skillSlug: string;
}) =>
  input.items
    .filter((item) => item.slug !== input.skillSlug)
    .slice(0, 4)
    .map((item) => ({
      description: item.description,
      id: item.id,
      slug: item.slug,
      title: item.title,
      versionLabel: item.latestVersion ? `v${item.latestVersion}` : "latest",
    })) satisfies SkillRelatedItem[];

const buildReviewSummary = (reviews: ReviewItem[]) => {
  const totalReviews = reviews.length;
  const ratingsTotal = reviews.reduce((total, review) => total + review.rating, 0);

  return {
    ratingAvg: totalReviews > 0 ? Number((ratingsTotal / totalReviews).toFixed(1)) : 0,
    ratingCounts: [5, 4, 3, 2, 1].map((stars) => ({
      count: reviews.filter((review) => review.rating === stars).length,
      stars,
    })),
    recommendPct:
      totalReviews > 0
        ? Math.round((reviews.filter((review) => review.rating >= 4).length / totalReviews) * 100)
        : 0,
    totalReviews,
  };
};

const getFileKindLabel = (path: string) => {
  const lowered = path.toLowerCase();
  if (lowered.endsWith(".md")) {
    return "Markdown";
  }
  if (lowered.endsWith(".json")) {
    return "JSON";
  }
  if (lowered.endsWith(".yaml") || lowered.endsWith(".yml")) {
    return "YAML";
  }
  if (lowered.endsWith(".ts")) {
    return "TypeScript";
  }
  if (lowered.endsWith(".tsx")) {
    return "TSX";
  }
  if (lowered.endsWith(".js")) {
    return "JavaScript";
  }
  if (lowered.endsWith(".sh")) {
    return "Shell";
  }
  if (lowered.endsWith(".diff")) {
    return "Diff";
  }

  return "Text";
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const buildFileTreeRows = (
  entries: Array<{ path: string; size?: number }>,
  activePath: string,
): SkillFileTreeRow[] => {
  interface TreeNode {
    children: Map<string, TreeNode>;
    name: string;
    path: string;
    size?: number;
    type: "file" | "folder";
  }

  const root: TreeNode = {
    children: new Map(),
    name: "",
    path: "",
    type: "folder",
  };

  for (const entry of [...entries].toSorted((a, b) => a.path.localeCompare(b.path))) {
    const segments = entry.path.split("/").filter(Boolean);
    let currentNode = root;
    let currentPath = "";

    for (const [index, segment] of segments.entries()) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const type = index === segments.length - 1 ? "file" : "folder";
      const existing = currentNode.children.get(segment);

      if (existing) {
        currentNode = existing;
        continue;
      }

      const nextNode: TreeNode = {
        children: new Map(),
        name: segment,
        path: currentPath,
        size: type === "file" ? entry.size : undefined,
        type,
      };
      currentNode.children.set(segment, nextNode);
      currentNode = nextNode;
    }
  }

  const rows: SkillFileTreeRow[] = [];

  const visit = (node: TreeNode, depth: number) => {
    const folders: TreeNode[] = [];
    const files: TreeNode[] = [];

    for (const child of [...node.children.values()].toSorted((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      if (child.type === "folder") {
        folders.push(child);
      } else {
        files.push(child);
      }
    }

    for (const folder of folders) {
      rows.push({
        depth,
        isActive: false,
        name: folder.name,
        path: folder.path,
        type: "folder",
      });
      visit(folder, depth + 1);
    }

    for (const file of files) {
      rows.push({
        depth,
        isActive: file.path === activePath,
        name: file.name,
        path: file.path,
        size: file.size,
        type: "file",
      });
    }
  };

  visit(root, 0);

  return rows;
};

const getSkillBaseRecord = async (
  client: AppRouterClient,
  slug: string,
  reviewTabLabel?: string,
): Promise<SkillBaseRecord | null> => {
  const path = (await client.skills.resolvePathBySlug({ slug })) as SkillPathRecord | null;
  if (!path?.authorHandle) {
    return null;
  }

  const [authorSkillsResult, skill] = await Promise.all([
    client.skills.search({
      authorHandle: path.authorHandle,
      limit: 12,
      sort: "downloads-all-time",
    }),
    client.skills.getByPath({
      authorHandle: path.authorHandle,
      repoName: path.repoName,
      skillSlug: path.skillSlug,
    }),
  ]);

  if (!skill) {
    return null;
  }

  const snapshotsResult = await client.snapshots.listBySkill({
    limit: 8,
    skillId: skill.id,
  });

  const authorSkills = authorSkillsResult.page.map((item) => ({
    slug: item.slug,
    title: item.title,
  }));
  const snapshots = snapshotsResult.page as SnapshotItem[];

  return {
    latestSnapshot: snapshots[0] ?? null,
    layout: buildSkillLayout({
      authorHandle: path.authorHandle,
      authorSkills,
      reviewTabLabel,
      skill,
      snapshots,
    }),
    relatedSkills: buildRelatedSkills({
      authorHandle: path.authorHandle,
      items: authorSkillsResult.page,
      skillSlug: skill.slug,
    }),
    skill,
    snapshots,
  };
};

export const getSkillDocumentPageData = async (
  client: AppRouterClient,
  slug: string,
): Promise<SkillDocumentPageData | null> => {
  const base = await getSkillBaseRecord(client, slug);
  if (!base) {
    return null;
  }

  if (!base.latestSnapshot) {
    return {
      contentHtml: await renderMarkdownAsync(base.skill.description),
      entryMetaLabel: "Snapshot content unavailable",
      frontmatter: null,
      layout: base.layout,
      relatedSkills: base.relatedSkills,
      tocItems: [],
    };
  }

  const content = (await client.snapshots.readSnapshotFileContent({
    maxBytes: 200_000,
    path: base.latestSnapshot.entryPath,
    snapshotId: base.latestSnapshot.id,
  })) as SnapshotFileContent;
  const parsed = parseSkillMarkdownDocument(content.content);
  const documentSource = parsed.body || base.skill.description;

  return {
    contentHtml: await renderContentAsync({
      content: documentSource,
      isMarkdown: true,
      path: base.latestSnapshot.entryPath,
    }),
    entryMetaLabel: [
      base.latestSnapshot.entryPath,
      `${formatInteger(content.totalBytes)} bytes`,
      content.isTruncated ? "truncated" : null,
    ]
      .filter(Boolean)
      .join(" · "),
    frontmatter: parsed.frontmatter,
    layout: base.layout,
    relatedSkills: base.relatedSkills,
    tocItems: parsed.tocItems,
  };
};

export const getSkillReviewsPageData = async (
  client: AppRouterClient,
  slug: string,
): Promise<SkillReviewsPageData | null> => {
  const base = await getSkillBaseRecord(client, slug);
  if (!base) {
    return null;
  }

  const reviews = (await client.reviews.listBySkill({
    limit: 100,
    skillId: base.skill.id,
  })) as ReviewItem[];
  const summary = buildReviewSummary(reviews);

  return {
    layout: {
      ...base.layout,
      reviewTabLabel:
        summary.totalReviews > 0 ? `Reviews · ${formatInteger(summary.totalReviews)}` : "Reviews",
    },
    ratingAvg: summary.ratingAvg,
    ratingCounts: summary.ratingCounts,
    recommendPct: summary.recommendPct,
    reviews: await Promise.all(
      reviews.map(async (review, index) => ({
        authorName: review.author.name,
        bodyHtml: await renderMarkdownAsync(review.content),
        dateLabel: formatDateLabel(review.createdAt) ?? "Unknown date",
        id: review.id,
        isLast: index === reviews.length - 1,
        stars: review.rating,
        versionLabel: base.skill.latestVersion ? `v${base.skill.latestVersion}` : undefined,
      })),
    ),
    totalReviews: summary.totalReviews,
  };
};

export const getSkillChangelogPageData = async (
  client: AppRouterClient,
  slug: string,
): Promise<SkillChangelogPageData | null> => {
  const base = await getSkillBaseRecord(client, slug);
  if (!base) {
    return null;
  }

  return {
    entries: base.snapshots.map((snapshot, index) => ({
      body: snapshot.description,
      dateLabel: formatDateLabel(snapshot.sourceCommitDate ?? snapshot.syncTime) ?? "Unknown date",
      isCurrent: index === 0,
      shaLabel: snapshot.hash.slice(0, 7),
      title: snapshot.sourceCommitMessage?.trim() || snapshot.description,
      version: snapshot.version,
    })),
    layout: base.layout,
  };
};

export const getSkillFileTreePageData = async (
  client: AppRouterClient,
  slug: string,
  requestedPath: string | null,
): Promise<SkillFileTreePageData | null> => {
  const base = await getSkillBaseRecord(client, slug);
  if (!base) {
    return null;
  }

  if (!base.latestSnapshot) {
    return {
      activeFile: null,
      layout: base.layout,
      rows: [],
    };
  }

  const treeEntries = (await client.snapshots.getSnapshotTreeEntries({
    snapshotId: base.latestSnapshot.id,
  })) as SnapshotTreeEntry[];
  const filePaths = treeEntries
    .map((entry) => entry.path)
    .toSorted((left, right) => left.localeCompare(right));
  const activePath =
    requestedPath && filePaths.includes(requestedPath)
      ? requestedPath
      : filePaths.includes(base.latestSnapshot.entryPath)
        ? base.latestSnapshot.entryPath
        : filePaths[0];

  if (!activePath) {
    return {
      activeFile: null,
      layout: base.layout,
      rows: [],
    };
  }

  const content = (await client.snapshots.readSnapshotFileContent({
    maxBytes: 160_000,
    path: activePath,
    snapshotId: base.latestSnapshot.id,
  })) as SnapshotFileContent;

  return {
    activeFile: {
      html: await renderContentAsync({
        content: content.content,
        path: activePath,
      }),
      isTruncated: content.isTruncated,
      metaLabel: [
        getFileKindLabel(activePath),
        `${formatInteger(content.totalBytes)} bytes`,
        content.isTruncated ? "truncated" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      path: activePath,
    },
    layout: base.layout,
    rows: buildFileTreeRows(treeEntries, activePath),
  };
};

export const getSkillBasePageData = async (client: AppRouterClient, slug: string) =>
  await getSkillBaseRecord(client, slug);

export const getSkillDiffVersions = async (client: AppRouterClient, slug: string) => {
  const base = await getSkillBaseRecord(client, slug);
  if (!base) {
    return null;
  }

  return {
    currentVersion: base.snapshots[0]?.version,
    layout: base.layout,
    previousVersion: base.snapshots[1]?.version,
  };
};
