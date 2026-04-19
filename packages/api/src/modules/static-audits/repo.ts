import { and, asc, desc, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { reposTable, skillsTable, snapshotsTable, staticAuditsTable } from "@skills-re/db/schema";
import { asSnapshotId } from "@skills-re/db/utils";

import { db } from "../shared/db";

export async function getLatestStaticAuditBySnapshot(snapshotId: string, database = db) {
  const rows = await database
    .select({
      auditJson: staticAuditsTable.auditJson,
      findingsJson: staticAuditsTable.findingsJson,
      filesScanned: staticAuditsTable.filesScanned,
      generatedAt: staticAuditsTable.generatedAt,
      id: staticAuditsTable.id,
      isBlocked: staticAuditsTable.isBlocked,
      modelVersion: staticAuditsTable.modelVersion,
      overallScore: staticAuditsTable.overallScore,
      reportR2Key: staticAuditsTable.reportR2Key,
      riskLevel: staticAuditsTable.riskLevel,
      safeToPublish: staticAuditsTable.safeToPublish,
      status: staticAuditsTable.status,
      summary: staticAuditsTable.summary,
      syncTime: staticAuditsTable.syncTime,
      totalLines: staticAuditsTable.totalLines,
    })
    .from(staticAuditsTable)
    .where(eq(staticAuditsTable.snapshotId, asSnapshotId(snapshotId)))
    .orderBy(desc(staticAuditsTable.syncTime))
    .limit(1);

  return rows[0] ?? null;
}

export async function countSnapshotsMissingStaticAudits(
  input: {
    maxSyncTime?: number;
  },
  database = db,
) {
  const filters = [
    eq(snapshotsTable.isDeprecated, false),
    isNotNull(snapshotsTable.sourceCommitSha),
    isNull(staticAuditsTable.id),
    sql`length(trim(${snapshotsTable.sourceCommitSha})) > 0`,
  ];

  if (input.maxSyncTime !== undefined) {
    filters.push(lte(snapshotsTable.syncTime, input.maxSyncTime));
  }

  const rows = await database
    .select({
      count: sql<number>`count(*)`,
    })
    .from(snapshotsTable)
    .innerJoin(skillsTable, eq(skillsTable.id, snapshotsTable.skillId))
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .leftJoin(staticAuditsTable, eq(staticAuditsTable.snapshotId, snapshotsTable.id))
    .where(and(...filters))
    .limit(1);

  return rows[0]?.count ?? 0;
}

export async function listSnapshotsMissingStaticAudits(
  input: {
    limit: number;
    maxSyncTime?: number;
    offset?: number;
  },
  database = db,
) {
  const filters = [
    eq(snapshotsTable.isDeprecated, false),
    isNotNull(snapshotsTable.sourceCommitSha),
    isNull(staticAuditsTable.id),
    sql`length(trim(${snapshotsTable.sourceCommitSha})) > 0`,
  ];

  if (input.maxSyncTime !== undefined) {
    filters.push(lte(snapshotsTable.syncTime, input.maxSyncTime));
  }

  return await database
    .select({
      owner: reposTable.ownerHandle,
      repo: reposTable.name,
      skillRootPath: snapshotsTable.directoryPath,
      snapshotId: snapshotsTable.id,
      sourceCommitSha: snapshotsTable.sourceCommitSha,
      syncTime: snapshotsTable.syncTime,
    })
    .from(snapshotsTable)
    .innerJoin(skillsTable, eq(skillsTable.id, snapshotsTable.skillId))
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .leftJoin(staticAuditsTable, eq(staticAuditsTable.snapshotId, snapshotsTable.id))
    .where(and(...filters))
    .orderBy(asc(snapshotsTable.syncTime), asc(snapshotsTable.id))
    .offset(input.offset ?? 0)
    .limit(input.limit);
}
