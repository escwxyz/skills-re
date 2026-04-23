import { toSearchSkillItem } from "../shared/search-skill";
import type { SearchSkillRow } from "../shared/search-skill";

const skillMarkdownFilenamePattern = /^skill\.md$/i;
const slugPattern = /^[a-z0-9-]+$/;
const semverLikePattern = /^\d+\.\d+\.\d+(?:[-+][a-z0-9.-]+)?$/i;

interface SkillPathCandidate {
  authorHandle: string;
  repoName?: string;
  skillSlug: string;
}

interface SkillResolutionCandidates {
  pathCandidates: SkillPathCandidate[];
  slugCandidates: string[];
}

interface AiSearchRow {
  authorHandle: string | null;
  content: string | null;
  key: string | null;
  repoName: string | null;
  score: number | null;
  skillSlug: string | null;
  sourcePath: string | null;
  version: string | null;
}

interface AiSearchBasicSkillRow {
  description: string;
  id: string;
  slug: string;
  syncTime: number;
  title: string;
}

export type AiSearchResolvedSkillRow = SearchSkillRow | AiSearchBasicSkillRow;

export interface AiSearchMatch {
  itemKey?: string;
  score?: number;
  snippet?: string;
  sourcePath?: string;
  version?: string;
}

export interface AiSearchPageItem {
  aiMatch?: AiSearchMatch;
  author?: {
    githubUrl: string;
    handle: string;
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
    isBlocked: boolean;
    overallScore: number;
    riskLevel: "safe" | "low" | "medium" | "high" | "critical";
    safeToPublish: boolean;
    status: "pass" | "fail";
    summary: string;
    syncTime: number;
  };
  syncTime?: number;
  tags?: string[];
  title: string;
  updatedAt?: number;
  viewsAllTime?: number;
}

export interface AiSearchResult {
  ai: {
    mode: "ai";
    raw: {
      resolution: {
        pathCandidatesCount: number;
        slugCandidatesCount: number;
      };
      response: unknown;
    };
    resolvedSkillsCount: number;
    resultCount: number;
  };
  continueCursor: "";
  isDone: true;
  page: AiSearchPageItem[];
}

const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

const coerceNonEmptyString = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const coerceFiniteNumber = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

const coerceSnippet = (value: unknown) => {
  const text = coerceNonEmptyString(value);
  if (!text) {
    return null;
  }

  const normalized = text.replaceAll(/\s+/g, " ").trim();
  if (normalized.length <= 320) {
    return normalized;
  }

  return `${normalized.slice(0, 317)}...`;
};

const normalizeSkillPathParts = (value: unknown) => {
  const path = coerceNonEmptyString(value);
  if (!path) {
    return null;
  }

  const normalized = path.replaceAll("\\", "/");
  const parts = normalized
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  return { normalized, parts };
};

const findLastPartIndex = (parts: string[], matcher: (part: string) => boolean) => {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (matcher(parts[index] ?? "")) {
      return index;
    }
  }

  return -1;
};

const buildSkillPathDetails = (
  normalized: string,
  owner: string | null,
  repo: string | null,
  skillSlug: string | null,
  version: string | null,
) => ({
  authorHandle: owner,
  repoName: repo,
  skillSlug: skillSlug && slugPattern.test(skillSlug) ? skillSlug.toLowerCase() : null,
  sourcePath: normalized,
  version,
});

const parseSkillsFolderPath = (parts: string[], skillsIndex: number) => {
  if (skillsIndex === -1 || skillsIndex + 1 >= parts.length) {
    return null;
  }

  const skillSlug = parts[skillsIndex + 1] ?? null;
  const maybeVersion = parts[skillsIndex + 2];
  return {
    skillSlug,
    version: maybeVersion && semverLikePattern.test(maybeVersion) ? maybeVersion : null,
  };
};

const parseSkillMdPath = (parts: string[], skillMdIndex: number) => {
  if (skillMdIndex <= 0) {
    return null;
  }

  const immediate = parts[skillMdIndex - 1] ?? null;
  if (immediate && semverLikePattern.test(immediate) && skillMdIndex > 1) {
    return {
      skillSlug: parts[skillMdIndex - 2] ?? null,
      version: immediate,
    };
  }

  return {
    skillSlug: immediate,
    version: null,
  };
};

const parseSkillPathDetails = (value: unknown) => {
  const pathParts = normalizeSkillPathParts(value);
  if (!pathParts) {
    return null;
  }

  const { normalized, parts } = pathParts;
  const [owner = null, repo = null] = parts;
  const skillMdIndex = findLastPartIndex(parts, (part) => skillMarkdownFilenamePattern.test(part));
  const skillsIndex = findLastPartIndex(parts, (part) => part.toLowerCase() === "skills");
  const details =
    parseSkillsFolderPath(parts, skillsIndex) ?? parseSkillMdPath(parts, skillMdIndex);

  return buildSkillPathDetails(
    normalized,
    owner,
    repo,
    details?.skillSlug ?? null,
    details?.version ?? null,
  );
};

const collectSkillResolutionCandidates = (raw: unknown): SkillResolutionCandidates => {
  const pathCandidates: SkillPathCandidate[] = [];
  const pathKeySet = new Set<string>();
  const slugs = new Set<string>();

  const addPathCandidate = (candidate: SkillPathCandidate) => {
    const authorHandle = candidate.authorHandle.trim().toLowerCase();
    const repoName = candidate.repoName?.trim();
    const skillSlug = candidate.skillSlug.trim().toLowerCase();
    if (!(authorHandle && skillSlug)) {
      return;
    }

    const key = `${authorHandle}:${repoName ?? ""}:${skillSlug}`;
    if (pathKeySet.has(key)) {
      return;
    }

    pathKeySet.add(key);
    pathCandidates.push({
      authorHandle,
      repoName,
      skillSlug,
    });
  };

  const addSlug = (value: unknown) => {
    const slug = coerceNonEmptyString(value)?.toLowerCase();
    if (slug) {
      slugs.add(slug);
    }
  };

  const resolveSkillSlugFromParts = (parts: string[]) => {
    const skillMdIndex = findLastPartIndex(parts, (part) =>
      skillMarkdownFilenamePattern.test(part),
    );

    if (skillMdIndex > 0) {
      const immediate = parts[skillMdIndex - 1] ?? null;
      if (immediate && semverLikePattern.test(immediate) && skillMdIndex > 1) {
        return parts[skillMdIndex - 2] ?? null;
      }
      return immediate;
    }

    const maybeSlug = parts.at(-1);
    if (maybeSlug && slugPattern.test(maybeSlug)) {
      return maybeSlug;
    }

    return null;
  };

  const addPathCandidateFromParts = (
    parts: string[],
    owner: string | undefined,
    repo: string | undefined,
    explicitSkillSlug?: string | null,
  ) => {
    const skillSlug = explicitSkillSlug ?? resolveSkillSlugFromParts(parts);
    if (!skillSlug || !owner || owner === "snapshots") {
      return;
    }

    addPathCandidate({
      authorHandle: owner,
      repoName: repo,
      skillSlug,
    });
  };

  const fromPath = (value: unknown) => {
    const path = coerceNonEmptyString(value);
    if (!path) {
      return;
    }

    const normalized = path.replaceAll("\\", "/");
    const parts = normalized.split("/").filter(Boolean);
    const normalizedParts = parts.map((part) => part.trim());
    const [owner, repo] = normalizedParts;
    const skillsIndex = findLastPartIndex(
      normalizedParts,
      (part) => part.toLowerCase() === "skills",
    );
    const skillsFolderSlug = skillsIndex === -1 ? null : (normalizedParts[skillsIndex + 1] ?? null);
    addSlug(skillsFolderSlug);
    if (skillsFolderSlug) {
      addPathCandidateFromParts(normalizedParts, owner, repo, skillsFolderSlug);
    }

    const skillSlug = resolveSkillSlugFromParts(normalizedParts);
    if (skillSlug) {
      addSlug(skillSlug);
      if (skillSlug !== skillsFolderSlug) {
        addPathCandidateFromParts(normalizedParts, owner, repo, skillSlug);
      }
    }
  };

  const payload = raw as { data?: unknown } | null;
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  for (const row of rows) {
    const item = row as {
      attributes?: {
        folder?: unknown;
      };
      filename?: unknown;
      id?: unknown;
      itemKey?: unknown;
      item_key?: unknown;
      key?: unknown;
      metadata?: {
        folder?: unknown;
        filename?: unknown;
        path?: unknown;
        skillSlug?: unknown;
        skill_slug?: unknown;
        slug?: unknown;
      };
      slug?: unknown;
    };

    fromPath(item.key);
    fromPath(item.item_key);
    fromPath(item.itemKey);
    fromPath(item.id);
    addSlug(item.slug);
    addSlug(item.metadata?.slug);
    addSlug(item.metadata?.skillSlug);
    addSlug(item.metadata?.skill_slug);
    fromPath(item.metadata?.folder);
    fromPath(item.metadata?.filename);
    fromPath(item.metadata?.path);
    fromPath(item.filename);
    fromPath(item.attributes?.folder);
  }

  return {
    pathCandidates,
    slugCandidates: [...slugs],
  };
};

const getAiRowKey = (item: {
  filename?: unknown;
  id?: unknown;
  itemKey?: unknown;
  item_key?: unknown;
  key?: unknown;
}) =>
  coerceNonEmptyString(item.key) ??
  coerceNonEmptyString(item.item_key) ??
  coerceNonEmptyString(item.itemKey) ??
  coerceNonEmptyString(item.filename) ??
  coerceNonEmptyString(item.id) ??
  null;

const getAiRowDirectPathDetails = (item: {
  attributes?: {
    folder?: unknown;
  };
  filename?: unknown;
  id?: unknown;
  itemKey?: unknown;
  item_key?: unknown;
  key?: unknown;
}) =>
  parseSkillPathDetails(item.key) ??
  parseSkillPathDetails(item.item_key) ??
  parseSkillPathDetails(item.itemKey) ??
  parseSkillPathDetails(item.filename) ??
  parseSkillPathDetails(item.attributes?.folder) ??
  parseSkillPathDetails(item.id);

const getAiRowContent = (item: { content?: unknown; text?: unknown }) => {
  const contentFromArray = Array.isArray(item.content)
    ? item.content
        .map((block) => {
          const textBlock = block as { text?: unknown };
          return coerceNonEmptyString(textBlock.text);
        })
        .filter((value): value is string => value !== null)
        .join(" ")
    : null;

  return coerceSnippet(contentFromArray) ?? coerceSnippet(item.content) ?? coerceSnippet(item.text);
};

const getAiRowSkillSlug = (
  item: {
    metadata?: {
      skillSlug?: unknown;
      skill_slug?: unknown;
      slug?: unknown;
    };
  },
  directPathDetails: {
    skillSlug: string | null;
  } | null,
) =>
  coerceNonEmptyString(item.metadata?.skillSlug)?.toLowerCase() ??
  coerceNonEmptyString(item.metadata?.skill_slug)?.toLowerCase() ??
  coerceNonEmptyString(item.metadata?.slug)?.toLowerCase() ??
  directPathDetails?.skillSlug ??
  null;

const extractAiRow = (row: unknown): AiSearchRow => {
  const item = row as {
    attributes?: {
      folder?: unknown;
    };
    content?: unknown;
    filename?: unknown;
    id?: unknown;
    itemKey?: unknown;
    item_key?: unknown;
    key?: unknown;
    metadata?: {
      skillSlug?: unknown;
      skill_slug?: unknown;
      slug?: unknown;
    };
    score?: unknown;
    text?: unknown;
  };
  const directPathDetails = getAiRowDirectPathDetails(item);

  return {
    authorHandle: directPathDetails?.authorHandle ?? null,
    content: getAiRowContent(item),
    key: getAiRowKey(item),
    repoName: directPathDetails?.repoName ?? null,
    score: coerceFiniteNumber(item.score),
    skillSlug: getAiRowSkillSlug(item, directPathDetails),
    sourcePath: directPathDetails?.sourcePath ?? null,
    version: directPathDetails?.version ?? null,
  };
};

const extractAiRows = (raw: unknown): AiSearchRow[] => {
  const payload = raw as { data?: unknown } | null;
  const rows = Array.isArray(payload?.data) ? payload.data : [];

  return rows.map((row) => extractAiRow(row));
};

const rowRank = (row: AiSearchRow) => row.score ?? Number.NEGATIVE_INFINITY;

const pickBestRowByPath = (
  rows: AiSearchRow[],
  candidate: {
    authorHandle?: string;
    repoName?: string;
    skillSlug?: string;
  },
) => {
  const authorHandle = candidate.authorHandle?.toLowerCase();
  const repoName = candidate.repoName ?? undefined;
  const skillSlug = candidate.skillSlug?.toLowerCase();
  if (!(authorHandle && skillSlug)) {
    return null;
  }

  let best: AiSearchRow | null = null;
  for (const row of rows) {
    if (
      row.authorHandle === authorHandle &&
      row.skillSlug === skillSlug &&
      (repoName ? row.repoName === repoName : true) &&
      (!best || rowRank(row) > rowRank(best))
    ) {
      best = row;
    }
  }

  return best;
};

const pickBestRowBySlug = (rows: AiSearchRow[], skillSlug?: string) => {
  const slug = skillSlug?.toLowerCase();
  if (!slug) {
    return null;
  }

  let best: AiSearchRow | null = null;
  for (const row of rows) {
    if (row.skillSlug === slug && (!best || rowRank(row) > rowRank(best))) {
      best = row;
    }
  }

  return best;
};

const toResolvedSkillItem = (row: AiSearchResolvedSkillRow) => {
  if ("authorHandle" in row) {
    return toSearchSkillItem(row);
  }

  return {
    description: row.description,
    id: row.id,
    slug: row.slug,
    syncTime: row.syncTime,
    title: row.title,
  };
};

const getAiSearchResultCount = (raw: unknown) =>
  Array.isArray((raw as { data?: unknown })?.data) ? (raw as { data: unknown[] }).data.length : 0;

const getAiMatch = (aiRows: AiSearchRow[], skill: AiSearchResolvedSkillRow) => {
  const bestRowByPath = pickBestRowByPath(aiRows, {
    authorHandle: "authorHandle" in skill ? skill.authorHandle : undefined,
    repoName: "repoName" in skill ? skill.repoName : undefined,
    skillSlug: skill.slug,
  });
  const bestRow = bestRowByPath ?? pickBestRowBySlug(aiRows, skill.slug);
  if (!bestRow) {
    return null;
  }

  return {
    itemKey: bestRow.key ?? undefined,
    score: bestRow.score ?? undefined,
    snippet: bestRow.content ?? undefined,
    sourcePath: bestRow.sourcePath ?? undefined,
    version: bestRow.version ?? undefined,
  };
};

const toAiSearchPageItem = (skill: AiSearchResolvedSkillRow, aiRows: AiSearchRow[]) => {
  const pageItem = toResolvedSkillItem(skill);
  const aiMatch = getAiMatch(aiRows, skill);
  if (!aiMatch) {
    return pageItem;
  }

  return {
    ...pageItem,
    aiMatch,
  };
};

export async function buildAiSearchResult(input: {
  raw: unknown;
  resolveSkillByPath: (candidate: SkillPathCandidate) => Promise<SearchSkillRow | null>;
  resolveSkillBySlug: (slug: string) => Promise<AiSearchResolvedSkillRow | null>;
}): Promise<AiSearchResult> {
  const { pathCandidates, slugCandidates } = collectSkillResolutionCandidates(input.raw);
  const aiRows = extractAiRows(input.raw);
  const resolvedByPathResults = await Promise.all(
    pathCandidates.slice(0, 40).map(async (candidate) => await input.resolveSkillByPath(candidate)),
  );
  const resolvedByPath = resolvedByPathResults.filter(isDefined);

  const seenSkillIds = new Set(resolvedByPath.map((skill) => skill.id));
  const resolvedBySlugResults = await Promise.all(
    slugCandidates.slice(0, 40).map(async (slug) => await input.resolveSkillBySlug(slug)),
  );
  const resolvedBySlug = resolvedBySlugResults
    .filter(isDefined)
    .filter((skill): skill is AiSearchResolvedSkillRow => !seenSkillIds.has(skill.id));
  const resolvedSkills = [...resolvedByPath, ...resolvedBySlug].slice(0, 24);

  return {
    ai: {
      mode: "ai",
      raw: {
        resolution: {
          pathCandidatesCount: pathCandidates.length,
          slugCandidatesCount: slugCandidates.length,
        },
        response: input.raw,
      },
      resolvedSkillsCount: resolvedSkills.length,
      resultCount: getAiSearchResultCount(input.raw),
    },
    continueCursor: "",
    isDone: true,
    page: resolvedSkills.map((skill) => toAiSearchPageItem(skill, aiRows)),
  };
}
