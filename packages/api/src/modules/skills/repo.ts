import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import { reposTable } from "@skills-re/db/schema/repos";
import { skillsTable } from "@skills-re/db/schema/skills";
import { snapshotFilesTable, snapshotsTable } from "@skills-re/db/schema/snapshots";
import { skillsTagsTable, tagsTable } from "@skills-re/db/schema";
import { asRepoId, asSkillId, asUserId, createId } from "@skills-re/db/utils";
import type { RepoId, SkillId, SnapshotId } from "@skills-re/db/utils";

import { db } from "../shared/db";
import { decodeRepoCursor, encodeRepoCursor } from "../repos/cursor";
import { hasMatchingDirectoryPath, normalizeRepoDirectoryPath } from "../repos/directory-path";
import { defaultLimit } from "../shared/pagination";

export interface SkillHistoryInfo {
  directoryPath: string;
  entryPath: string;
  id: string;
  latestDescription: string;
  latestName: string;
  latestVersion: string;
}

export interface SkillClaimContext {
  claimedUserId: string | null;
  repoOwnerHandle: string | null;
  skillId: SkillId;
}

const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

export async function listSkillsPageBySyncTime(input?: { cursor?: string; limit?: number }) {
  const limit = input?.limit ?? defaultLimit;
  const cursor = decodeRepoCursor(input?.cursor);

  const rows = await db
    .select({
      description: skillsTable.description,
      id: skillsTable.id,
      slug: skillsTable.slug,
      syncTime: skillsTable.syncTime,
      title: skillsTable.title,
    })
    .from(skillsTable)
    .where(
      cursor
        ? and(
            eq(skillsTable.visibility, "public"),
            sql`(${skillsTable.syncTime}, ${skillsTable.id}) < (${cursor.syncTime}, ${cursor.id})`,
          )
        : eq(skillsTable.visibility, "public"),
    )
    .orderBy(desc(skillsTable.syncTime), desc(skillsTable.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const next = page.at(-1) ?? null;

  return {
    continueCursor: encodeRepoCursor(
      rows.length > limit && next
        ? {
            id: next.id,
            syncTime: next.syncTime,
          }
        : null,
    ),
    isDone: rows.length <= limit,
    page,
  };
}

export async function listSkillsByUserId(input: { userId: string; limit?: number }) {
  const limit = input.limit ?? 50;

  const rows = await db
    .select({
      authorHandle: reposTable.ownerHandle,
      createdAt: skillsTable.createdAt,
      description: skillsTable.description,
      id: skillsTable.id,
      latestVersion: skillsTable.latestVersion,
      repoName: reposTable.name,
      slug: skillsTable.slug,
      title: skillsTable.title,
      updatedAt: skillsTable.updatedAt,
    })
    .from(skillsTable)
    .leftJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(eq(skillsTable.userId, asUserId(input.userId)))
    .orderBy(desc(skillsTable.updatedAt), desc(skillsTable.id))
    .limit(limit);

  return rows;
}

export async function createSkill(input: {
  description: string;
  repoId: string;
  slug: string;
  syncTime: number;
  title: string;
  userId?: string | null;
  visibility?: "public" | "private";
}) {
  const rows = await db
    .insert(skillsTable)
    .values({
      description: input.description,
      id: asSkillId(createId()),
      latestCommitDate: null,
      latestCommitMessage: null,
      latestCommitSha: null,
      latestCommitUrl: null,
      latestEvaluationId: null,
      latestSnapshotId: null,
      primaryCategory: null,
      repoId: asRepoId(input.repoId),
      slug: input.slug,
      syncTime: input.syncTime,
      title: input.title,
      userId: input.userId ? asUserId(input.userId) : null,
      visibility: input.visibility ?? "public",
    } as never)
    .returning({
      id: skillsTable.id,
    });

  const [created] = rows;
  if (!created) {
    throw new Error("Failed to create skill record");
  }

  return created.id;
}

export async function listSkillCategorizationTargetsByIds(skillIds: SkillId[]) {
  if (skillIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      categoryId: skillsTable.primaryCategory,
      description: skillsTable.description,
      id: skillsTable.id,
      tags: sql<string>`coalesce(group_concat(distinct ${tagsTable.slug}), '')`,
      title: skillsTable.title,
    })
    .from(skillsTable)
    .leftJoin(skillsTagsTable, eq(skillsTagsTable.skillId, skillsTable.id))
    .leftJoin(tagsTable, eq(tagsTable.id, skillsTagsTable.tagId))
    .where(inArray(skillsTable.id, skillIds))
    .groupBy(skillsTable.id)
    .orderBy(skillsTable.id);

  return rows.map((row) => ({
    categoryId: row.categoryId,
    description: row.description,
    id: row.id,
    tags: row.tags ? row.tags.split(",").filter(Boolean) : [],
    title: row.title,
  }));
}

export async function updateSkillCategory(input: { categoryId: string | null; skillId: string }) {
  await db
    .update(skillsTable)
    .set({
      primaryCategory: input.categoryId,
    })
    .where(eq(skillsTable.id, asSkillId(input.skillId)));
}

export async function countSkills() {
  const rows = await db
    .select({
      value: sql<number>`count(*)`,
    })
    .from(skillsTable)
    .where(eq(skillsTable.visibility, "public"));

  return rows[0]?.value ?? 0;
}

export async function findSkillById(id: string) {
  const rows = await db
    .select({
      description: skillsTable.description,
      id: skillsTable.id,
      slug: skillsTable.slug,
      syncTime: skillsTable.syncTime,
      title: skillsTable.title,
    })
    .from(skillsTable)
    .where(and(eq(skillsTable.id, id as SkillId), eq(skillsTable.visibility, "public")))
    .limit(1);

  return rows[0] ?? null;
}

export async function findSkillBySlug(slug: string) {
  const rows = await db
    .select({
      description: skillsTable.description,
      id: skillsTable.id,
      slug: skillsTable.slug,
      syncTime: skillsTable.syncTime,
      title: skillsTable.title,
    })
    .from(skillsTable)
    .where(and(eq(skillsTable.slug, slug), eq(skillsTable.visibility, "public")))
    .limit(1);

  return rows[0] ?? null;
}

export async function findSkillByPath(input: {
  authorHandle: string;
  repoName?: string;
  skillSlug: string;
}) {
  const clauses = [
    eq(reposTable.ownerHandle, input.authorHandle),
    eq(skillsTable.slug, input.skillSlug),
    eq(skillsTable.visibility, "public"),
  ];

  if (input.repoName) {
    clauses.push(eq(reposTable.name, input.repoName));
  }

  const rows = await db
    .select({
      authorHandle: reposTable.ownerHandle,
      createdAt: skillsTable.createdAt,
      description: skillsTable.description,
      downloadsAllTime: skillsTable.downloadsAllTime,
      downloadsTrending: skillsTable.downloadsTrending,
      forkCount: reposTable.forks,
      id: skillsTable.id,
      isVerified: skillsTable.isVerified,
      latestVersion: skillsTable.latestVersion,
      license: reposTable.license,
      primaryCategory: skillsTable.primaryCategory,
      repoName: reposTable.name,
      repoUrl: reposTable.url,
      slug: skillsTable.slug,
      stargazerCount: reposTable.stars,
      syncTime: skillsTable.syncTime,
      title: skillsTable.title,
      updatedAt: skillsTable.updatedAt,
      viewsAllTime: skillsTable.viewsAllTime,
    })
    .from(skillsTable)
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(and(...clauses))
    .limit(1);

  return rows[0] ?? null;
}

export async function checkSkillExistingBySlug(slug: string) {
  const row = await findSkillBySlug(slug);
  return Boolean(row);
}

export async function resolveSkillPathBySlug(slug: string) {
  const rows = await db
    .select({
      authorHandle: reposTable.ownerHandle,
      repoName: reposTable.name,
      skillSlug: skillsTable.slug,
    })
    .from(skillsTable)
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(and(eq(skillsTable.slug, slug), eq(skillsTable.visibility, "public")))
    .limit(1);

  return rows[0] ?? null;
}

export async function listAuthors() {
  const rows = await db
    .select({
      avatarUrl: sql<string | null>`max(${reposTable.ownerAvatarUrl})`,
      githubUrl: sql<string>`'https://github.com/' || ${reposTable.ownerHandle}`,
      handle: reposTable.ownerHandle,
      isVerified: sql<number>`max(case when ${skillsTable.isVerified} then 1 else 0 end)`,
      name: sql<string | null>`max(${reposTable.ownerName})`,
      repoCount: sql<number>`count(distinct ${reposTable.id})`,
      skillCount: sql<number>`count(${skillsTable.id})`,
    })
    .from(reposTable)
    .innerJoin(skillsTable, eq(skillsTable.repoId, reposTable.id))
    .where(and(eq(skillsTable.visibility, "public"), sql`trim(${reposTable.ownerHandle}) <> ''`))
    .groupBy(reposTable.ownerHandle)
    .orderBy(desc(sql`count(${skillsTable.id})`), asc(reposTable.ownerHandle));

  return rows;
}

export async function findAuthorByHandle(handle: string) {
  const rows = await db
    .select({
      avatarUrl: sql<string | null>`max(${reposTable.ownerAvatarUrl})`,
      githubUrl: sql<string>`'https://github.com/' || ${reposTable.ownerHandle}`,
      handle: reposTable.ownerHandle,
      isVerified: sql<number>`max(case when ${skillsTable.isVerified} then 1 else 0 end)`,
      name: sql<string | null>`max(${reposTable.ownerName})`,
      repoCount: sql<number>`count(distinct ${reposTable.id})`,
      skillCount: sql<number>`count(${skillsTable.id})`,
    })
    .from(reposTable)
    .innerJoin(skillsTable, eq(skillsTable.repoId, reposTable.id))
    .where(and(eq(reposTable.ownerHandle, handle), eq(skillsTable.visibility, "public")))
    .groupBy(reposTable.ownerHandle)
    .limit(1);

  return rows[0] ?? null;
}

export async function findSkillClaimContextBySlug(slug: string) {
  const rows = await db
    .select({
      claimedUserId: skillsTable.userId,
      repoOwnerHandle: reposTable.ownerHandle,
      skillId: skillsTable.id,
    })
    .from(skillsTable)
    .leftJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(eq(skillsTable.slug, slug))
    .limit(1);

  return rows[0] ?? null;
}

export async function claimSkillById(input: { skillId: string; userId: string }) {
  await db
    .update(skillsTable)
    .set({
      syncTime: Date.now(),
      userId: asUserId(input.userId),
    })
    .where(eq(skillsTable.id, input.skillId as SkillId));
}

export async function updateSkillAiSearchItemId(input: {
  aiSearchItemId: string;
  skillId: string;
}) {
  await db
    .update(skillsTable)
    .set({ aiSearchItemId: input.aiSearchItemId })
    .where(eq(skillsTable.id, input.skillId as SkillId));
}

export async function listReposPageBySyncTime(input?: { cursor?: string; limit?: number }) {
  const limit = input?.limit ?? defaultLimit;
  const cursor = decodeRepoCursor(input?.cursor);

  const rows = await db
    .select({
      forks: reposTable.forks,
      id: reposTable.id,
      license: reposTable.license,
      name: reposTable.name,
      nameWithOwner: reposTable.nameWithOwner,
      ownerAvatarUrl: reposTable.ownerAvatarUrl,
      ownerHandle: reposTable.ownerHandle,
      ownerName: reposTable.ownerName,
      stars: reposTable.stars,
      syncTime: reposTable.syncTime,
      updatedAt: reposTable.updatedAt,
      url: reposTable.url,
    })
    .from(reposTable)
    .where(
      cursor
        ? sql`(${reposTable.syncTime}, ${reposTable.id}) < (${cursor.syncTime}, ${cursor.id})`
        : sql`1 = 1`,
    )
    .orderBy(desc(reposTable.syncTime), desc(reposTable.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const next = page.at(-1) ?? null;

  return {
    continueCursor: encodeRepoCursor(
      rows.length > limit && next
        ? {
            id: next.id,
            syncTime: next.syncTime,
          }
        : null,
    ),
    isDone: rows.length <= limit,
    repos: page.map((row) => ({
      nameWithOwner: row.nameWithOwner,
      repoName: row.name,
      repoOwner: row.ownerHandle,
    })),
  };
}

interface SearchSkillsPageInput {
  authorHandle?: string;
  categories?: string[];
  cursor?: string;
  limit?: number;
  minAuditScore?: number;
  minScore?: number;
  query?: string;
  sort?: "newest" | "updated" | "views" | "downloads-trending" | "downloads-all-time" | "stars";
  tags?: string[];
}

interface SearchCursor {
  offset: number;
}

const encodeSearchCursor = (cursor: SearchCursor | null) => {
  if (!cursor) {
    return "";
  }

  return btoa(JSON.stringify(cursor)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const decodeSearchCursor = (cursor: string | undefined) => {
  if (!cursor) {
    return 0;
  }

  try {
    const normalized = cursor
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(cursor.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(normalized)) as {
      offset?: unknown;
    };
    if (typeof parsed.offset === "number" && parsed.offset >= 0) {
      return parsed.offset;
    }
  } catch {
    return 0;
  }

  return 0;
};

const getSearchSortExpression = (sort: NonNullable<SearchSkillsPageInput["sort"]>) => {
  switch (sort) {
    case "downloads-all-time": {
      return desc(skillsTable.downloadsAllTime);
    }
    case "downloads-trending": {
      return desc(skillsTable.downloadsTrending);
    }
    case "stars": {
      return desc(reposTable.stars);
    }
    case "updated": {
      return desc(skillsTable.updatedAt);
    }
    case "views": {
      return desc(skillsTable.viewsAllTime);
    }
    default: {
      return desc(skillsTable.syncTime);
    }
  }
};

export async function searchSkillsPageByFilters(input?: SearchSkillsPageInput) {
  const limit = input?.limit ?? defaultLimit;
  const offset = decodeSearchCursor(input?.cursor);
  const sort = input?.sort ?? "newest";
  const query = input?.query?.trim();
  const trimmedAuthorHandle = input?.authorHandle?.trim();
  const categories = (input?.categories ?? []).map((value) => value.trim()).filter(Boolean);
  const tags = (input?.tags ?? []).map((value) => value.trim()).filter(Boolean);

  const clauses = [eq(skillsTable.visibility, "public")];

  if (trimmedAuthorHandle) {
    clauses.push(eq(reposTable.ownerHandle, trimmedAuthorHandle));
  }

  if (categories.length > 0) {
    clauses.push(inArray(skillsTable.primaryCategory, categories));
  }

  if (query) {
    const queryPattern = `%${query.toLowerCase()}%`;
    clauses.push(
      sql`(
        lower(${skillsTable.title}) like ${queryPattern}
        or lower(${skillsTable.description}) like ${queryPattern}
        or lower(${skillsTable.slug}) like ${queryPattern}
        or lower(${reposTable.name}) like ${queryPattern}
        or lower(${reposTable.ownerHandle}) like ${queryPattern}
      )`,
    );
  }

  const taggedSkillIds = tags.length
    ? db
        .select({
          skillId: skillsTagsTable.skillId,
        })
        .from(skillsTagsTable)
        .innerJoin(tagsTable, eq(tagsTable.id, skillsTagsTable.tagId))
        .where(inArray(tagsTable.slug, tags))
    : null;

  if (taggedSkillIds) {
    clauses.push(inArray(skillsTable.id, taggedSkillIds));
  }

  const rows = await db
    .select({
      authorHandle: reposTable.ownerHandle,
      createdAt: skillsTable.createdAt,
      description: skillsTable.description,
      downloadsAllTime: skillsTable.downloadsAllTime,
      downloadsTrending: skillsTable.downloadsTrending,
      forkCount: reposTable.forks,
      id: skillsTable.id,
      isVerified: skillsTable.isVerified,
      latestVersion: skillsTable.latestVersion,
      license: reposTable.license,
      primaryCategory: skillsTable.primaryCategory,
      repoName: reposTable.name,
      repoUrl: reposTable.url,
      slug: skillsTable.slug,
      stargazerCount: reposTable.stars,
      syncTime: skillsTable.syncTime,
      title: skillsTable.title,
      updatedAt: skillsTable.updatedAt,
      viewsAllTime: skillsTable.viewsAllTime,
    })
    .from(skillsTable)
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(and(...clauses))
    .orderBy(getSearchSortExpression(sort), desc(skillsTable.id))
    .limit(limit + 1)
    .offset(offset);

  const page = rows.slice(0, limit);
  const nextOffset = offset + page.length;
  return {
    continueCursor: encodeSearchCursor(rows.length > limit ? { offset: nextOffset } : null),
    isDone: rows.length <= limit,
    page,
  };
}

export async function checkReposExistingByOwner(repoOwner: string) {
  const rows = await db
    .select({
      id: reposTable.id,
    })
    .from(reposTable)
    .where(eq(reposTable.ownerHandle, repoOwner))
    .limit(1);

  return rows.length > 0;
}

export async function checkDuplicatedRepo(input: {
  directoryPath?: string;
  repoName: string;
  repoOwner: string;
}) {
  if (input.directoryPath) {
    // Only the latest snapshot per skill should participate in duplicate path checks.
    const existingDirectoryPaths = await listRepoSkillDirectoryPathsByRepoOwnerAndName({
      repoName: input.repoName,
      repoOwner: input.repoOwner,
    });
    return {
      duplicated: hasMatchingDirectoryPath(existingDirectoryPaths, input.directoryPath),
    };
  }

  const nameWithOwner = `${input.repoOwner}/${input.repoName}`;
  const rows = await db
    .select({
      id: reposTable.id,
    })
    .from(reposTable)
    .where(eq(reposTable.nameWithOwner, nameWithOwner))
    .limit(1);

  return {
    duplicated: rows.length > 0,
  };
}

async function listRepoSkillDirectoryPathsByRepoOwnerAndName(input: {
  repoName: string;
  repoOwner: string;
}) {
  const rows = await db
    .select({
      directoryPath: snapshotsTable.directoryPath,
      skillId: snapshotsTable.skillId,
    })
    .from(snapshotsTable)
    .innerJoin(skillsTable, eq(skillsTable.id, snapshotsTable.skillId))
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(
      and(
        eq(reposTable.ownerHandle, input.repoOwner),
        eq(reposTable.name, input.repoName),
        eq(snapshotsTable.isDeprecated, false),
      ),
    )
    .orderBy(desc(snapshotsTable.syncTime), desc(snapshotsTable.id));

  const seenSkillIds = new Set<string>();
  const directoryPaths = new Set<string>();
  for (const row of rows) {
    if (seenSkillIds.has(row.skillId)) {
      continue;
    }

    seenSkillIds.add(row.skillId);
    directoryPaths.add(normalizeRepoDirectoryPath(row.directoryPath));
  }

  return directoryPaths;
}

export interface RepoSkillSnapshotHead {
  directoryPath: string;
  entryPath: string;
  latestDescription: string;
  latestHash: string;
  latestName: string;
  latestSnapshotId: SnapshotId;
  latestSourceCommitSha: string | null;
  latestVersion: string;
  skillId: SkillId;
  slug: string;
}

export async function listRepoSkillSnapshotHeadsByRepoId(repoId: RepoId) {
  const rows = await db
    .select({
      description: snapshotsTable.description,
      directoryPath: snapshotsTable.directoryPath,
      entryPath: snapshotsTable.entryPath,
      hash: snapshotsTable.hash,
      latestSnapshotId: skillsTable.latestSnapshotId,
      skillId: skillsTable.id,
      slug: skillsTable.slug,
      snapshotId: snapshotsTable.id,
      sourceCommitSha: snapshotsTable.sourceCommitSha,
      title: skillsTable.title,
      version: snapshotsTable.version,
    })
    .from(skillsTable)
    .leftJoin(snapshotsTable, eq(snapshotsTable.id, skillsTable.latestSnapshotId))
    .where(eq(skillsTable.repoId, repoId))
    .orderBy(skillsTable.id);

  const latestBySkillId = new Map<SkillId, RepoSkillSnapshotHead>();
  for (const row of rows) {
    if (
      !(
        row.latestSnapshotId &&
        row.snapshotId &&
        row.version &&
        row.hash &&
        row.entryPath &&
        row.directoryPath
      )
    ) {
      continue;
    }

    latestBySkillId.set(row.skillId, {
      directoryPath: row.directoryPath,
      entryPath: row.entryPath,
      latestDescription: row.description ?? "",
      latestHash: row.hash,
      latestName: row.title,
      latestSnapshotId: row.latestSnapshotId,
      latestSourceCommitSha: row.sourceCommitSha,
      latestVersion: row.version,
      skillId: row.skillId,
      slug: row.slug,
    });
  }

  return [...latestBySkillId.values()];
}

export async function listSkillsHistoryInfoByIds(skillIds: string[]) {
  if (skillIds.length === 0) {
    return [] as SkillHistoryInfo[];
  }

  const rows = await db
    .select({
      description: snapshotsTable.description,
      directoryPath: snapshotsTable.directoryPath,
      entryPath: snapshotsTable.entryPath,
      name: snapshotsTable.name,
      skillId: snapshotsTable.skillId,
      syncTime: snapshotsTable.syncTime,
      version: snapshotsTable.version,
    })
    .from(snapshotsTable)
    .where(
      inArray(
        snapshotsTable.skillId,
        skillIds.map((skillId) => skillId as SkillId),
      ),
    )
    .orderBy(snapshotsTable.skillId, desc(snapshotsTable.syncTime), desc(snapshotsTable.id));

  const latestBySkillId = new Map<SkillId, SkillHistoryInfo>();
  for (const row of rows) {
    if (latestBySkillId.has(row.skillId)) {
      continue;
    }
    latestBySkillId.set(row.skillId, {
      directoryPath: row.directoryPath,
      entryPath: row.entryPath,
      id: row.skillId,
      latestDescription: row.description,
      latestName: row.name,
      latestVersion: row.version,
    });
  }

  return skillIds.map((skillId) => latestBySkillId.get(skillId as SkillId)).filter(isDefined);
}

export async function getSnapshotBySkillAndCommit(input: {
  skillId: SkillId;
  sourceCommitSha: string;
}) {
  const rows = await db
    .select({
      archiveR2Key: snapshotsTable.archiveR2Key,
      description: snapshotsTable.description,
      directoryPath: snapshotsTable.directoryPath,
      entryPath: snapshotsTable.entryPath,
      hash: snapshotsTable.hash,
      id: snapshotsTable.id,
      isDeprecated: snapshotsTable.isDeprecated,
      name: snapshotsTable.name,
      skillId: snapshotsTable.skillId,
      sourceCommitDate: snapshotsTable.sourceCommitDate,
      sourceCommitMessage: snapshotsTable.sourceCommitMessage,
      sourceCommitSha: snapshotsTable.sourceCommitSha,
      sourceCommitUrl: snapshotsTable.sourceCommitUrl,
      syncTime: snapshotsTable.syncTime,
      version: snapshotsTable.version,
    })
    .from(snapshotsTable)
    .where(
      and(
        eq(snapshotsTable.skillId, input.skillId),
        eq(snapshotsTable.sourceCommitSha, input.sourceCommitSha),
        eq(snapshotsTable.isDeprecated, false),
      ),
    )
    .orderBy(desc(snapshotsTable.syncTime))
    .limit(1);

  return rows[0] ?? null;
}

export interface AiSearchBackfillRow {
  aiSearchItemId: string | null;
  authorHandle: string;
  repoName: string;
  skillId: string;
  skillMdR2Key: string | null;
  skillSlug: string;
  snapshotId: string | null;
  version: string | null;
}

export async function listSkillsForAiSearchBackfill(input: {
  batchSize: number;
  lastSeenId?: string;
}): Promise<AiSearchBackfillRow[]> {
  const conditions = [isNull(skillsTable.aiSearchItemId), eq(skillsTable.visibility, "public")];
  if (input.lastSeenId !== undefined) {
    conditions.push(gt(skillsTable.id, asSkillId(input.lastSeenId)));
  }

  const rows = await db
    .select({
      aiSearchItemId: skillsTable.aiSearchItemId,
      authorHandle: reposTable.ownerHandle,
      repoName: reposTable.name,
      skillId: skillsTable.id,
      skillMdR2Key: snapshotFilesTable.r2Key,
      skillSlug: skillsTable.slug,
      snapshotId: snapshotsTable.id,
      version: snapshotsTable.version,
    })
    .from(skillsTable)
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .leftJoin(snapshotsTable, eq(snapshotsTable.id, skillsTable.latestSnapshotId))
    .leftJoin(
      snapshotFilesTable,
      and(
        eq(snapshotFilesTable.snapshotId, snapshotsTable.id),
        sql`lower(${snapshotFilesTable.path}) = 'skill.md' or lower(${snapshotFilesTable.path}) like '%/skill.md'`,
      ),
    )
    .where(and(...conditions))
    .orderBy(asc(skillsTable.id))
    .limit(input.batchSize);

  return rows.map((r) => ({
    aiSearchItemId: r.aiSearchItemId,
    authorHandle: r.authorHandle,
    repoName: r.repoName,
    skillId: String(r.skillId),
    skillMdR2Key: r.skillMdR2Key,
    skillSlug: r.skillSlug,
    snapshotId: r.snapshotId ? String(r.snapshotId) : null,
    version: r.version,
  }));
}
