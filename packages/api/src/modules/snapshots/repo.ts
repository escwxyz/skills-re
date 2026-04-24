import { and, desc, eq, inArray, sql } from "drizzle-orm";

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

export async function setSkillLatestSnapshot(
  input: {
    latestCommitDate?: number | null;
    latestCommitMessage?: string | null;
    latestCommitSha?: string | null;
    latestCommitUrl?: string | null;
    skillId: string;
    snapshotId: string;
    syncTime?: number;
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
