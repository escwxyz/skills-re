import { and, asc, eq, gt, isNotNull, isNull, ne, or, sql } from "drizzle-orm";

import {
  reposTable,
  skillSearchDocumentsTable,
  skillsTable,
  snapshotFilesTable,
  snapshotsTable,
} from "@skills-re/db/schema";
import type { SkillId } from "@skills-re/db/utils";

import { db } from "../shared/db";

interface SearchDocumentDiagnosticsDb {
  get: typeof db.get;
  run: typeof db.run;
  select: typeof db.select;
}

const defaultDiagnosticsDb = db as SearchDocumentDiagnosticsDb;

const toCount = (value: number | bigint | null | undefined) => Number(value ?? 0);

const DEFAULT_BACKFILL_PAGE_LIMIT = 100;
const DEFAULT_PLANNED_SKILL_COUNT = 20_000;
const DEFAULT_INTERNAL_DATABASE_CEILING_BYTES = 5_000_000_000;
const DEFAULT_DATABASE_HEADROOM_RATIO = 0.8;

interface SkillSearchBackfillCursor {
  id: string;
  updatedAt: number;
}

export interface SkillSearchBackfillRow {
  authorHandle: string;
  description: string;
  documentContentHash: string | null;
  documentIndexingStatus: string | null;
  documentSnapshotId: string | null;
  entryFileHash: string;
  entryPath: string;
  entryR2Key: string;
  repoName: string;
  skillContentHash: string | null;
  skillId: string;
  skillSlug: string;
  snapshotId: string;
  title: string;
  updatedAt: number;
}

const encodeSkillSearchBackfillCursor = (cursor: SkillSearchBackfillCursor | null) =>
  cursor ? Buffer.from(JSON.stringify(cursor), "utf-8").toString("base64url") : "";

const decodeSkillSearchBackfillCursor = (value?: string): SkillSearchBackfillCursor | null => {
  if (!value) {
    return null;
  }

  let parsed: Partial<SkillSearchBackfillCursor>;
  try {
    parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf-8"),
    ) as Partial<SkillSearchBackfillCursor>;
  } catch (error) {
    throw new Error("Invalid skill search backfill cursor: malformed token.", { cause: error });
  }

  if (typeof parsed.id !== "string" || typeof parsed.updatedAt !== "number") {
    throw new TypeError(
      "Invalid skill search backfill cursor: expected string id and numeric updatedAt.",
    );
  }

  return {
    id: parsed.id,
    updatedAt: parsed.updatedAt,
  };
};

const hasEntryR2Key = <TRow extends { entryR2Key: string | null }>(
  row: TRow,
): row is TRow & { entryR2Key: string } => row.entryR2Key !== null;

export const SKILL_SEARCH_FTS_INTEGRITY_CHECK_SQL =
  "INSERT INTO skills_fts(skills_fts) VALUES('integrity-check')";

export const SKILL_SEARCH_FTS_REBUILD_SQL = "INSERT INTO skills_fts(skills_fts) VALUES('rebuild')";

export const getSkillSearchDocumentDiagnostics = async (
  database: SearchDocumentDiagnosticsDb = defaultDiagnosticsDb,
) => {
  const [
    [eligiblePublicSkills],
    [documentCount],
    [staleSnapshotCount],
    [hashMismatchCount],
    [orphanedOrIneligibleCount],
    [oversizedDocumentCount],
  ] = await Promise.all([
    database
      .select({ value: sql<number>`count(*)` })
      .from(skillsTable)
      .where(and(eq(skillsTable.visibility, "public"), isNotNull(skillsTable.latestSnapshotId))),
    database
      .select({ value: sql<number>`count(*)` })
      .from(skillSearchDocumentsTable)
      .where(sql`1 = 1`),
    database
      .select({ value: sql<number>`count(*)` })
      .from(skillSearchDocumentsTable)
      .innerJoin(skillsTable, eq(skillsTable.id, skillSearchDocumentsTable.skillId))
      .where(
        or(
          isNull(skillsTable.latestSnapshotId),
          ne(skillSearchDocumentsTable.snapshotId, skillsTable.latestSnapshotId),
        ),
      ),
    database
      .select({ value: sql<number>`count(*)` })
      .from(skillSearchDocumentsTable)
      .innerJoin(snapshotsTable, eq(snapshotsTable.id, skillSearchDocumentsTable.snapshotId))
      .where(
        and(
          isNotNull(snapshotsTable.skillContentHash),
          ne(skillSearchDocumentsTable.contentHash, snapshotsTable.skillContentHash),
        ),
      ),
    database
      .select({ value: sql<number>`count(*)` })
      .from(skillSearchDocumentsTable)
      .leftJoin(skillsTable, eq(skillsTable.id, skillSearchDocumentsTable.skillId))
      .where(or(sql`${skillsTable.id} is null`, ne(skillsTable.visibility, "public"))),
    database
      .select({ value: sql<number>`count(*)` })
      .from(skillSearchDocumentsTable)
      .where(eq(skillSearchDocumentsTable.indexingStatus, "truncated")),
  ]);

  return {
    documentCount: toCount(documentCount?.value),
    eligiblePublicSkills: toCount(eligiblePublicSkills?.value),
    hashMismatchCount: toCount(hashMismatchCount?.value),
    orphanedOrIneligibleCount: toCount(orphanedOrIneligibleCount?.value),
    oversizedDocumentCount: toCount(oversizedDocumentCount?.value),
    staleSnapshotCount: toCount(staleSnapshotCount?.value),
  };
};

export const getSkillSearchDatabaseCapacityReport = async (
  input: {
    acceptedProjectionBytes?: number;
    baseDatabaseBytes?: number;
    headroomRatio?: number;
    internalCeilingBytes?: number;
    plannedSkillCount?: number;
  } = {},
  database: SearchDocumentDiagnosticsDb = defaultDiagnosticsDb,
) => {
  const plannedSkillCount = input.plannedSkillCount ?? DEFAULT_PLANNED_SKILL_COUNT;
  const internalCeilingBytes =
    input.internalCeilingBytes ?? DEFAULT_INTERNAL_DATABASE_CEILING_BYTES;
  const headroomRatio = input.headroomRatio ?? DEFAULT_DATABASE_HEADROOM_RATIO;
  const baseDatabaseBytes = input.baseDatabaseBytes ?? 0;
  const safetyThresholdBytes = Math.floor(internalCeilingBytes * headroomRatio);

  const [pageSize, pageCount, [documentStats]] = await Promise.all([
    database.get<{ page_size: number }>(sql`PRAGMA page_size`),
    database.get<{ page_count: number }>(sql`PRAGMA page_count`),
    database
      .select({
        documentCount: sql<number>`count(*)`,
        indexedBodyBytes: sql<number>`coalesce(sum(${skillSearchDocumentsTable.bodySizeBytes}), 0)`,
      })
      .from(skillSearchDocumentsTable)
      .where(sql`1 = 1`),
  ]);

  const actualDatabaseBytes = toCount(pageSize?.page_size) * toCount(pageCount?.page_count);
  const documentCount = toCount(documentStats?.documentCount);
  const indexedBodyBytes = toCount(documentStats?.indexedBodyBytes);
  const measuredSearchBytes = Math.max(0, actualDatabaseBytes - baseDatabaseBytes);
  const bytesPerIndexedDocument =
    documentCount > 0
      ? Math.max(indexedBodyBytes / documentCount, measuredSearchBytes / documentCount)
      : 0;
  const projectedSearchBytes = Math.ceil(bytesPerIndexedDocument * plannedSkillCount);
  const projectedTotalBytes = baseDatabaseBytes + projectedSearchBytes;
  const acceptedProjectionBytes = input.acceptedProjectionBytes ?? projectedTotalBytes;
  const blocksRollout =
    actualDatabaseBytes > safetyThresholdBytes ||
    projectedTotalBytes > safetyThresholdBytes ||
    projectedTotalBytes > acceptedProjectionBytes;

  return {
    acceptedProjectionBytes,
    actualDatabaseBytes,
    blocksRollout,
    bytesPerIndexedDocument,
    documentCount,
    headroomRatio,
    indexedBodyBytes,
    internalCeilingBytes,
    plannedSkillCount,
    projectedSearchBytes,
    projectedTotalBytes,
    safetyThresholdBytes,
  };
};

export const runSkillSearchFtsIntegrityCheck = async (
  database: SearchDocumentDiagnosticsDb = defaultDiagnosticsDb,
) => {
  await database.run(sql.raw(SKILL_SEARCH_FTS_INTEGRITY_CHECK_SQL));
};

export const rebuildSkillSearchFtsIndex = async (
  database: SearchDocumentDiagnosticsDb = defaultDiagnosticsDb,
) => {
  await database.run(sql.raw(SKILL_SEARCH_FTS_REBUILD_SQL));
};

const listSkillSearchBackfillPage = async (
  input: {
    cursor?: string;
    limit?: number;
    repairOnly?: boolean;
  } = {},
  database: SearchDocumentDiagnosticsDb = defaultDiagnosticsDb,
) => {
  const limit = Math.max(1, Math.min(input.limit ?? DEFAULT_BACKFILL_PAGE_LIMIT, 500));
  const cursor = decodeSkillSearchBackfillCursor(input.cursor);
  const cursorCondition = cursor
    ? or(
        gt(skillsTable.updatedAt, cursor.updatedAt),
        and(eq(skillsTable.updatedAt, cursor.updatedAt), gt(skillsTable.id, cursor.id as SkillId)),
      )
    : undefined;
  const repairCondition = input.repairOnly
    ? or(
        sql`${skillSearchDocumentsTable.skillId} is null`,
        ne(skillSearchDocumentsTable.snapshotId, snapshotsTable.id),
        and(
          isNotNull(snapshotsTable.skillContentHash),
          ne(skillSearchDocumentsTable.contentHash, snapshotsTable.skillContentHash),
        ),
      )
    : undefined;

  const rows = await database
    .select({
      authorHandle: reposTable.ownerHandle,
      description: skillsTable.description,
      documentContentHash: skillSearchDocumentsTable.contentHash,
      documentIndexingStatus: skillSearchDocumentsTable.indexingStatus,
      documentSnapshotId: skillSearchDocumentsTable.snapshotId,
      entryFileHash: snapshotFilesTable.fileHash,
      entryPath: snapshotsTable.entryPath,
      entryR2Key: snapshotFilesTable.r2Key,
      repoName: reposTable.name,
      skillContentHash: snapshotsTable.skillContentHash,
      skillId: skillsTable.id,
      skillSlug: skillsTable.slug,
      snapshotId: snapshotsTable.id,
      title: skillsTable.title,
      updatedAt: skillsTable.updatedAt,
    })
    .from(skillsTable)
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .innerJoin(snapshotsTable, eq(snapshotsTable.id, skillsTable.latestSnapshotId))
    .innerJoin(
      snapshotFilesTable,
      and(
        eq(snapshotFilesTable.snapshotId, snapshotsTable.id),
        isNotNull(snapshotFilesTable.r2Key),
        or(
          sql`lower(${snapshotFilesTable.path}) = lower(${snapshotsTable.entryPath})`,
          sql`lower(${snapshotsTable.entryPath}) like '%/' || lower(${snapshotFilesTable.path})`,
        ),
      ),
    )
    .leftJoin(skillSearchDocumentsTable, eq(skillSearchDocumentsTable.skillId, skillsTable.id))
    .where(
      and(
        eq(skillsTable.visibility, "public"),
        isNotNull(skillsTable.latestSnapshotId),
        cursorCondition,
        repairCondition,
      ),
    )
    .orderBy(asc(skillsTable.updatedAt), asc(skillsTable.id))
    .limit(limit + 1);

  const typedRows: SkillSearchBackfillRow[] = rows.filter(hasEntryR2Key);
  const page = typedRows.slice(0, limit);
  const next = page.at(-1) ?? null;
  const hasMoreRows = rows.length > limit;

  return {
    continueCursor: encodeSkillSearchBackfillCursor(
      hasMoreRows && next
        ? {
            id: next.skillId,
            updatedAt: next.updatedAt,
          }
        : null,
    ),
    isDone: !hasMoreRows,
    page,
  };
};

export const listEligibleSkillSearchBackfillPage = async (
  input: { cursor?: string; limit?: number } = {},
  database: SearchDocumentDiagnosticsDb = defaultDiagnosticsDb,
) => await listSkillSearchBackfillPage(input, database);

export const listRepairableSkillSearchBackfillPage = async (
  input: { cursor?: string; limit?: number } = {},
  database: SearchDocumentDiagnosticsDb = defaultDiagnosticsDb,
) => await listSkillSearchBackfillPage({ ...input, repairOnly: true }, database);

export const deleteOrphanedSkillSearchDocuments = async (
  database: SearchDocumentDiagnosticsDb = defaultDiagnosticsDb,
) => {
  await database.run(sql`
    delete from skill_search_documents
    where skill_id not in (
      select id from skills where visibility = 'public'
    )
  `);
};

export const reconcileSkillSearchDocuments = async (
  input: {
    rebuildFts?: boolean;
    runIntegrityCheck?: boolean;
  } = {},
  database: SearchDocumentDiagnosticsDb = defaultDiagnosticsDb,
) => {
  await deleteOrphanedSkillSearchDocuments(database);
  if (input.rebuildFts) {
    await rebuildSkillSearchFtsIndex(database);
  }
  if (input.runIntegrityCheck) {
    await runSkillSearchFtsIntegrityCheck(database);
  }
  return await getSkillSearchDocumentDiagnostics(database);
};
