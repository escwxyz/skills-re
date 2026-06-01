import { and, asc, desc, eq, gt, inArray, isNotNull, lte, sql } from "drizzle-orm";

import { reposTable } from "@skills-re/db/schema/repos";
import { snapshotFilesTable, snapshotsTable } from "@skills-re/db/schema/snapshots";
import { skillsTable } from "@skills-re/db/schema/skills";
import { asSkillId, asSnapshotId, createId } from "@skills-re/db/utils";
import type { SkillId, SnapshotId } from "@skills-re/db/utils";

import { db } from "../shared/db";

export interface SnapshotPageCursor {
  id: string;
  syncTime: number;
}

export interface SnapshotListItem {
  archiveR2Key: string | null;
  description: string;
  directoryPath: string;
  entryPath: string;
  hash: string;
  id: string;
  isDeprecated: boolean;
  name: string;
  skillId: string;
  sourceCommitDate: number | null;
  sourceCommitMessage: string | null;
  sourceCommitSha: string | null;
  sourceCommitUrl: string | null;
  syncTime: number;
  version: string;
}

export interface SnapshotFileRow {
  contentType: string | null;
  fileHash: string;
  path: string;
  r2Key: string | null;
  size: number;
  sourceSha: string | null;
}

export interface LatestSnapshotRawFilesBackfillRow {
  directoryPath: string;
  repoName: string;
  repoOwner: string;
  skillId: string;
  snapshotId: string;
  sourceCommitSha: string;
  syncTime: number;
}

const selectSnapshotFields = {
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
} as const;

const selectSnapshotFileFields = {
  contentType: snapshotFilesTable.contentType,
  fileHash: snapshotFilesTable.fileHash,
  path: snapshotFilesTable.path,
  r2Key: snapshotFilesTable.r2Key,
  size: snapshotFilesTable.size,
  sourceSha: snapshotFilesTable.sourceSha,
} as const;

export async function createSnapshot(
  input: {
    description: string;
    directoryPath: string;
    entryPath: string;
    frontmatterHash?: string | null;
    hash: string;
    isDeprecated?: boolean;
    name: string;
    skillContentHash?: string | null;
    skillId: string;
    sourceCommitDate?: number;
    sourceCommitMessage?: string | null;
    sourceCommitSha?: string | null;
    sourceCommitUrl?: string | null;
    syncTime: number;
    version: string;
  },
  database = db,
) {
  const [existing] = await database
    .select({ id: snapshotsTable.id })
    .from(snapshotsTable)
    .where(
      and(
        eq(snapshotsTable.skillId, asSkillId(input.skillId)),
        eq(snapshotsTable.hash, input.hash),
        eq(snapshotsTable.isDeprecated, false),
      ),
    )
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const snapshotId = asSnapshotId(createId());
  const rows = await database
    .insert(snapshotsTable)
    .values({
      createdAtMs: input.syncTime,
      description: input.description,
      directoryPath: input.directoryPath,
      entryPath: input.entryPath,
      evaluationId: null,
      frontmatterHash: input.frontmatterHash ?? null,
      hash: input.hash,
      id: snapshotId,
      isDeprecated: input.isDeprecated ?? false,
      name: input.name,
      skillContentHash: input.skillContentHash ?? null,
      skillId: asSkillId(input.skillId),
      sourceCommitDate: input.sourceCommitDate ?? null,
      sourceCommitMessage: input.sourceCommitMessage ?? null,
      sourceCommitSha: input.sourceCommitSha ?? null,
      sourceCommitUrl: input.sourceCommitUrl ?? null,
      syncTime: input.syncTime,
      version: input.version,
    })
    .returning({
      id: snapshotsTable.id,
    });

  return rows[0]?.id ?? snapshotId;
}

export async function findSnapshotByContentHashes(input: {
  frontmatterHash: string;
  skillContentHash: string;
}): Promise<{ skillId: string } | null> {
  const [row] = await db
    .select({ skillId: snapshotsTable.skillId })
    .from(snapshotsTable)
    .where(
      and(
        eq(snapshotsTable.frontmatterHash, input.frontmatterHash),
        eq(snapshotsTable.skillContentHash, input.skillContentHash),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function setSkillLatestSnapshot(
  input: {
    latestCommitDate?: number | null;
    latestCommitMessage?: string | null;
    latestCommitSha?: string | null;
    latestCommitUrl?: string | null;
    skillId: string;
    snapshotId: string;
    syncTime?: number;
    version: string;
  },
  database = db,
) {
  await database
    .update(skillsTable)
    .set({
      latestCommitDate: input.latestCommitDate ?? null,
      latestCommitMessage: input.latestCommitMessage ?? null,
      latestCommitSha: input.latestCommitSha ?? null,
      latestCommitUrl: input.latestCommitUrl ?? null,
      latestSnapshotId: asSnapshotId(input.snapshotId),
      latestVersion: input.version,
      syncTime: input.syncTime ?? Date.now(),
    })
    .where(eq(skillsTable.id, asSkillId(input.skillId)));
}

export async function deprecateSnapshotsBeyondLimit(
  input: {
    keepLatest?: number;
    skillId: string;
  },
  database = db,
) {
  const keepLatest = Math.max(1, input.keepLatest ?? 3);
  const rows = await database
    .select({
      id: snapshotsTable.id,
    })
    .from(snapshotsTable)
    .where(
      and(
        eq(snapshotsTable.skillId, asSkillId(input.skillId)),
        eq(snapshotsTable.isDeprecated, false),
      ),
    )
    .orderBy(desc(snapshotsTable.syncTime), desc(snapshotsTable.id));

  const idsToDeprecate = rows.slice(keepLatest).map((row) => row.id);
  if (idsToDeprecate.length === 0) {
    return 0;
  }

  await database
    .update(snapshotsTable)
    .set({
      isDeprecated: true,
    })
    .where(inArray(snapshotsTable.id, idsToDeprecate));

  return idsToDeprecate.length;
}

export async function upsertSnapshotFiles(
  snapshotId: SnapshotId,
  files: {
    contentType?: string | null;
    fileHash: string;
    path: string;
    r2Key?: string | null;
    size: number;
    sourceSha?: string | null;
  }[],
  database = db,
) {
  if (files.length === 0) {
    return;
  }

  // D1 caps each statement at 100 bound parameters. This insert uses 7 binds per row,
  // so keep the chunk size low enough to stay under the limit.
  const BATCH_SIZE = 14;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await database
      .insert(snapshotFilesTable)
      .values(
        batch.map((file) => ({
          contentType: file.contentType ?? null,
          fileHash: file.fileHash,
          path: file.path,
          r2Key: file.r2Key ?? null,
          size: file.size,
          snapshotId,
          sourceSha: file.sourceSha ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: [snapshotFilesTable.snapshotId, snapshotFilesTable.path],
        set: {
          contentType: sql`excluded.content_type`,
          fileHash: sql`excluded.file_hash`,
          r2Key: sql`excluded.r2_key`,
          size: sql`excluded.size`,
          sourceSha: sql`excluded.source_sha`,
        },
      });
  }
}

export async function deleteSnapshotFilesByPaths(
  input: {
    paths: string[];
    snapshotId: SnapshotId;
  },
  database = db,
) {
  if (input.paths.length === 0) {
    return;
  }

  await database
    .delete(snapshotFilesTable)
    .where(
      and(
        eq(snapshotFilesTable.snapshotId, input.snapshotId),
        inArray(snapshotFilesTable.path, input.paths),
      ),
    );
}

export async function setSnapshotArchiveR2Key(
  input: {
    archiveR2Key: string;
    snapshotId: string;
  },
  database = db,
) {
  await database
    .update(snapshotsTable)
    .set({
      archiveR2Key: input.archiveR2Key,
    })
    .where(eq(snapshotsTable.id, asSnapshotId(input.snapshotId)));
}

export async function getSnapshotStorageContext(snapshotId: SnapshotId) {
  const rows = await db
    .select({
      directoryPath: snapshotsTable.directoryPath,
      repoName: reposTable.name,
      repoOwner: reposTable.ownerHandle,
      snapshotId: snapshotsTable.id,
      version: snapshotsTable.version,
    })
    .from(snapshotsTable)
    .innerJoin(skillsTable, eq(skillsTable.id, snapshotsTable.skillId))
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(eq(snapshotsTable.id, snapshotId))
    .limit(1);

  const [row] = rows;
  if (!row) {
    return null;
  }

  return {
    directoryPath: row.directoryPath,
    repoName: row.repoName,
    repoOwner: row.repoOwner,
    snapshotId: row.snapshotId,
    version: row.version,
  };
}

export const getSnapshotBySkillAndVersion = async (input: {
  skillId: SkillId;
  version: string;
}): Promise<SnapshotListItem | null> => {
  const rows = await db
    .select(selectSnapshotFields)
    .from(snapshotsTable)
    .where(
      and(
        eq(snapshotsTable.skillId, input.skillId),
        eq(snapshotsTable.version, input.version),
        eq(snapshotsTable.isDeprecated, false),
      ),
    )
    .orderBy(desc(snapshotsTable.syncTime))
    .limit(1);

  return rows[0] ?? null;
};

export const getSnapshotById = async (snapshotId: SnapshotId): Promise<SnapshotListItem | null> => {
  const rows = await db
    .select(selectSnapshotFields)
    .from(snapshotsTable)
    .where(eq(snapshotsTable.id, snapshotId))
    .limit(1);

  return rows[0] ?? null;
};

export const listSnapshotsPageBySkill = async (input: {
  skillId: SkillId;
  limit?: number;
  cursor?: SnapshotPageCursor | null;
}) => {
  const limit = input.limit ?? 20;
  const cursor = input.cursor ?? null;

  const rows = await db
    .select(selectSnapshotFields)
    .from(snapshotsTable)
    .where(
      cursor
        ? and(
            eq(snapshotsTable.skillId, input.skillId),
            eq(snapshotsTable.isDeprecated, false),
            sql`(${snapshotsTable.syncTime}, ${snapshotsTable.id}) < (${cursor.syncTime}, ${cursor.id})`,
          )
        : and(eq(snapshotsTable.skillId, input.skillId), eq(snapshotsTable.isDeprecated, false)),
    )
    .orderBy(desc(snapshotsTable.syncTime), desc(snapshotsTable.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const next = page.at(-1) ?? null;

  return {
    isDone: !hasMore,
    nextCursor:
      hasMore && next
        ? {
            id: next.id,
            syncTime: next.syncTime,
          }
        : null,
    page,
  };
};

export const listSnapshotFiles = async (snapshotId: SnapshotId): Promise<SnapshotFileRow[]> =>
  await db
    .select(selectSnapshotFileFields)
    .from(snapshotFilesTable)
    .where(eq(snapshotFilesTable.snapshotId, snapshotId))
    .orderBy(snapshotFilesTable.path);

export async function listLatestSnapshotsForRawFilesBackfill(input: {
  batchSize: number;
  lastSeenSkillId?: string;
  maxSyncTime?: number;
  repoName?: string;
  repoOwner?: string;
}): Promise<LatestSnapshotRawFilesBackfillRow[]> {
  const filters = [
    eq(skillsTable.visibility, "public"),
    isNotNull(skillsTable.latestSnapshotId),
    isNotNull(snapshotsTable.sourceCommitSha),
    sql`length(trim(${snapshotsTable.sourceCommitSha})) > 0`,
  ];

  if (input.lastSeenSkillId) {
    filters.push(gt(skillsTable.id, asSkillId(input.lastSeenSkillId)));
  }

  if (input.maxSyncTime !== undefined) {
    filters.push(lte(snapshotsTable.syncTime, input.maxSyncTime));
  }

  if (input.repoOwner) {
    filters.push(eq(reposTable.ownerHandle, input.repoOwner));
  }

  if (input.repoName) {
    filters.push(eq(reposTable.name, input.repoName));
  }

  return await db
    .select({
      directoryPath: snapshotsTable.directoryPath,
      repoName: reposTable.name,
      repoOwner: reposTable.ownerHandle,
      skillId: skillsTable.id,
      snapshotId: snapshotsTable.id,
      sourceCommitSha: snapshotsTable.sourceCommitSha,
      syncTime: snapshotsTable.syncTime,
    })
    .from(skillsTable)
    .innerJoin(snapshotsTable, eq(snapshotsTable.id, skillsTable.latestSnapshotId))
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(and(...filters))
    .orderBy(asc(skillsTable.id))
    .limit(input.batchSize)
    .then((rows) =>
      rows.map((row) => ({
        directoryPath: row.directoryPath,
        repoName: row.repoName,
        repoOwner: row.repoOwner,
        skillId: row.skillId,
        snapshotId: row.snapshotId,
        sourceCommitSha: row.sourceCommitSha ?? "",
        syncTime: row.syncTime,
      })),
    );
}

export const getSnapshotFileByPath = async (input: {
  snapshotId: SnapshotId;
  path: string;
}): Promise<SnapshotFileRow | null> => {
  const rows = await db
    .select(selectSnapshotFileFields)
    .from(snapshotFilesTable)
    .where(
      and(
        eq(snapshotFilesTable.snapshotId, input.snapshotId),
        eq(snapshotFilesTable.path, input.path),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
};
