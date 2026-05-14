import { and, asc, desc, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { reposTable, skillsTable, snapshotsTable, staticAuditsTable } from "@skills-re/db/schema";
import { asSnapshotId } from "@skills-re/db/utils";

import { db } from "../shared/db";

const normalizeDirectoryPath = (value: string) =>
  value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");

export async function findStaticAuditByIdempotencyKey(idempotencyKey: string, database = db) {
  const rows = await database
    .select({
      id: staticAuditsTable.id,
    })
    .from(staticAuditsTable)
    .where(eq(staticAuditsTable.idempotencyKey, idempotencyKey))
    .limit(1);

  return rows[0] ?? null;
}

export async function findSnapshotIdForStaticAudit(
  input: {
    entryPath?: string;
    owner: string;
    repo: string;
    skillRootPath?: string;
  },
  database = db,
) {
  const rows = await database
    .select({
      entryPath: snapshotsTable.entryPath,
      id: snapshotsTable.id,
      skillDirectoryPath: snapshotsTable.directoryPath,
    })
    .from(snapshotsTable)
    .innerJoin(skillsTable, eq(skillsTable.id, snapshotsTable.skillId))
    .innerJoin(reposTable, eq(reposTable.id, skillsTable.repoId))
    .where(and(eq(reposTable.ownerHandle, input.owner), eq(reposTable.name, input.repo)))
    .orderBy(desc(snapshotsTable.syncTime))
    .limit(30);

  const normalizedEntryPath = input.entryPath?.trim();
  const normalizedSkillRootPath = input.skillRootPath
    ? normalizeDirectoryPath(input.skillRootPath)
    : undefined;

  const directMatch = rows.find((row) => {
    if (normalizedEntryPath && row.entryPath !== normalizedEntryPath) {
      return false;
    }

    if (normalizedSkillRootPath) {
      return normalizeDirectoryPath(row.skillDirectoryPath) === normalizedSkillRootPath;
    }

    return true;
  });

  return directMatch?.id ?? null;
}

export async function upsertStaticAudit(
  input: {
    auditJson: string;
    entryPath?: string;
    filesScanned: number;
    findingsJson: string;
    generatedAt: number;
    idempotencyKey: string;
    isBlocked: boolean;
    modelVersion?: string | null;
    overallScore: number;
    pipeline: string;
    pipelineRunId: string;
    reason?: string;
    repoName: string;
    repoOwner: string;
    reportR2Key?: string | null;
    riskFactorsJson: string;
    riskLevel: "safe" | "low" | "medium" | "high" | "critical";
    rulesVersion: string;
    safeToPublish: boolean;
    skillRootPath?: string;
    snapshotId?: string | null;
    sourceHash: string;
    sourceRef?: string;
    sourceType: string;
    status: "pass" | "fail";
    summary: string;
    totalLines: number;
    treeHash?: string;
  },
  database = db,
) {
  await database
    .insert(staticAuditsTable)
    .values({
      auditJson: input.auditJson,
      entryPath: input.entryPath,
      filesScanned: input.filesScanned,
      findingsJson: input.findingsJson,
      generatedAt: input.generatedAt,
      idempotencyKey: input.idempotencyKey,
      isBlocked: input.isBlocked,
      modelVersion: input.modelVersion ?? null,
      overallScore: input.overallScore,
      pipeline: input.pipeline,
      pipelineRunId: input.pipelineRunId,
      reason: input.reason,
      repoName: input.repoName,
      repoOwner: input.repoOwner,
      reportR2Key: input.reportR2Key ?? null,
      riskFactorsJson: input.riskFactorsJson,
      riskLevel: input.riskLevel,
      rulesVersion: input.rulesVersion,
      safeToPublish: input.safeToPublish,
      skillRootPath: input.skillRootPath,
      snapshotId: input.snapshotId ? asSnapshotId(input.snapshotId) : null,
      sourceHash: input.sourceHash,
      sourceRef: input.sourceRef,
      sourceType: input.sourceType,
      status: input.status,
      summary: input.summary,
      syncTime: Date.now(),
      totalLines: input.totalLines,
      treeHash: input.treeHash,
    })
    .onConflictDoUpdate({
      set: {
        auditJson: input.auditJson,
        entryPath: input.entryPath,
        filesScanned: input.filesScanned,
        findingsJson: input.findingsJson,
        generatedAt: input.generatedAt,
        isBlocked: input.isBlocked,
        modelVersion: input.modelVersion ?? null,
        overallScore: input.overallScore,
        pipeline: input.pipeline,
        pipelineRunId: input.pipelineRunId,
        reason: input.reason,
        repoName: input.repoName,
        repoOwner: input.repoOwner,
        reportR2Key: input.reportR2Key ?? null,
        riskFactorsJson: input.riskFactorsJson,
        riskLevel: input.riskLevel,
        rulesVersion: input.rulesVersion,
        safeToPublish: input.safeToPublish,
        skillRootPath: input.skillRootPath,
        snapshotId: input.snapshotId ? asSnapshotId(input.snapshotId) : null,
        sourceHash: input.sourceHash,
        sourceRef: input.sourceRef,
        sourceType: input.sourceType,
        status: input.status,
        summary: input.summary,
        syncTime: Date.now(),
        totalLines: input.totalLines,
        treeHash: input.treeHash,
      },
      target: staticAuditsTable.idempotencyKey,
    });

  const rows = await database
    .select({
      id: staticAuditsTable.id,
    })
    .from(staticAuditsTable)
    .where(eq(staticAuditsTable.idempotencyKey, input.idempotencyKey))
    .limit(1);

  const [saved] = rows;
  if (!saved) {
    throw new Error("Failed to load upserted static audit.");
  }

  return saved.id;
}

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
