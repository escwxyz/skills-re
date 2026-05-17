import { and, asc, desc, eq, lt, or, sql } from "drizzle-orm";

import {
  sandboxAgentsTable,
  skillEvalCaseResultsTable,
  skillEvalCasesTable,
  skillEvalRunsTable,
  skillEvalSuitesTable,
  skillsTable,
  snapshotsTable,
} from "@skills-re/db/schema";
import {
  asSandboxAgentId,
  asSkillEvalCaseId,
  asSkillEvalRunId,
  asSkillEvalSuiteId,
  asSnapshotId,
  asUserId,
  createId,
} from "@skills-re/db/utils";
import type {
  SandboxAgentId,
  SkillEvalCaseResultId,
  SkillEvalCaseId,
  SkillEvalRunId,
  SkillEvalSuiteId,
  SkillId,
  SnapshotId,
  UserId,
} from "@skills-re/db/utils";
import type { createDb as createDbType } from "@skills-re/db/runtime";

import { db } from "../shared/db";

type Database = ReturnType<typeof createDbType>;

export interface SkillEvalSandboxAgentRow {
  capabilitiesJson: string;
  defaultLimitsJson: string;
  description: string | null;
  displayName: string;
  id: SandboxAgentId;
  provider: string;
  runtimeFamily: string;
  sortOrder: number;
  status: "active" | "deprecated" | "disabled";
}

export interface UpsertSkillEvalCaseInput {
  assertions: string[];
  caseId: string;
  expectedOutput: string | null;
  fingerprint: string;
  fixturePaths: string[];
  prompt: string;
  promptPreview: string;
  sortOrder: number;
  title: string | null;
}

export interface UpsertSkillEvalSuiteInput {
  caseCount: number;
  cases: UpsertSkillEvalCaseInput[];
  evalPath: string;
  fingerprint: string;
  skillId: string;
  snapshotId: SnapshotId;
  status: "valid" | "invalid" | "missing";
  validationErrors: string[];
}

export interface StoredSkillEvalCase {
  assertions: string[];
  caseId: string;
  expectedOutput: string | null;
  fingerprint: string;
  fixturePaths: string[];
  id: SkillEvalCaseId | string;
  promptPreview: string;
  sortOrder: number;
  syncTime: number;
  title: string | null;
}

export interface StoredSkillEvalSuite {
  caseCount: number;
  cases: StoredSkillEvalCase[];
  evalPath: string;
  fingerprint: string;
  id: SkillEvalSuiteId;
  skillId: SkillId | string;
  snapshotId: SnapshotId;
  status: "valid" | "invalid" | "missing";
  syncTime: number;
  validationErrors: string[];
}

export interface RunnableSkillRow {
  id: SkillId;
  latestSnapshotId: SnapshotId | null;
  visibility: string;
}

export interface SkillEvalRunRef {
  id: SkillEvalRunId;
  status: "pending" | "queued" | "running" | "pass" | "fail" | "blocked" | "cancelled";
}

export interface SkillEvalRunStatusUpdateResult extends SkillEvalRunRef {
  changed: boolean;
}

export interface SkillEvalRunCursor {
  id: string;
  syncTime: number;
}

export interface SkillEvalRunHistoryRow {
  agentDisplayName: string;
  agentId: SandboxAgentId;
  agentProvider: string;
  blockedCases: number;
  completedAt: number | null;
  createdAt: Date | number;
  failedCases: number;
  id: SkillEvalRunId;
  passedCases: number;
  skillId: SkillId | string;
  snapshotId: SnapshotId;
  snapshotVersion: string;
  status: SkillEvalRunRef["status"];
  syncTime: number;
  tokenCount: number | null;
  totalCases: number;
  totalDurationMs: number | null;
}

export interface SkillEvalRunHistoryPage {
  isDone: boolean;
  nextCursor: SkillEvalRunCursor | null;
  page: SkillEvalRunHistoryRow[];
}

export interface SkillEvalRunDetailRow extends SkillEvalRunHistoryRow {
  artifactPrefix: string;
  createdBy: UserId | string | null;
  errorCode: string | null;
  errorMessage: string | null;
  limitsJson: string;
  networkJson: string;
  policyVersion: string;
  suiteId: SkillEvalSuiteId;
}

export interface SkillEvalCaseResultRow {
  baselineArtifactsJson: string | null;
  baselineDurationMs: number | null;
  baselineErrorCode: string | null;
  baselineErrorMessage: string | null;
  baselineExitCode: number | null;
  baselineOutputPreview: string | null;
  baselineScore: number | null;
  baselineStatus: "pending" | "running" | "pass" | "fail" | "blocked" | null;
  baselineTokenCount: number | null;
  caseId: string;
  id: SkillEvalCaseResultId;
  runId: SkillEvalRunId;
  status: "pending" | "running" | "pass" | "fail" | "blocked";
  summary: string | null;
  withSkillArtifactsJson: string | null;
  withSkillDurationMs: number | null;
  withSkillErrorCode: string | null;
  withSkillErrorMessage: string | null;
  withSkillExitCode: number | null;
  withSkillOutputPreview: string | null;
  withSkillScore: number | null;
  withSkillStatus: "pending" | "running" | "pass" | "fail" | "blocked";
  withSkillTokenCount: number | null;
}

export interface UpdateSkillEvalRunStatusInput {
  completedAt?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  runId: SkillEvalRunId;
  status: SkillEvalRunRef["status"];
}

export interface InsertSkillEvalRunInput {
  agentId: string;
  artifactPrefix: string;
  createdBy: string;
  id: SkillEvalRunId;
  idempotencyKey?: string | null;
  limits: unknown;
  network: unknown;
  policyVersion: string;
  skillId: string;
  snapshotId: SnapshotId;
  status: SkillEvalRunRef["status"];
  suiteId: SkillEvalSuiteId | string;
  totalCases: number;
}

export async function listActiveAgents(
  database: Database = db,
): Promise<SkillEvalSandboxAgentRow[]> {
  return await database
    .select({
      capabilitiesJson: sandboxAgentsTable.capabilitiesJson,
      defaultLimitsJson: sandboxAgentsTable.defaultLimitsJson,
      description: sandboxAgentsTable.description,
      displayName: sandboxAgentsTable.displayName,
      id: sandboxAgentsTable.id,
      provider: sandboxAgentsTable.provider,
      runtimeFamily: sandboxAgentsTable.runtimeFamily,
      sortOrder: sandboxAgentsTable.sortOrder,
      status: sandboxAgentsTable.status,
    })
    .from(sandboxAgentsTable)
    .where(eq(sandboxAgentsTable.status, "active"))
    .orderBy(asc(sandboxAgentsTable.sortOrder), asc(sandboxAgentsTable.displayName));
}

export async function getRunnableSkillById(
  skillId: string,
  database: Database = db,
): Promise<RunnableSkillRow | null> {
  const rows = await database
    .select({
      id: skillsTable.id,
      latestSnapshotId: skillsTable.latestSnapshotId,
      visibility: skillsTable.visibility,
    })
    .from(skillsTable)
    .where(eq(skillsTable.id, skillId as SkillId))
    .limit(1);

  return rows[0] ?? null;
}

export async function findRunByIdempotencyKey(
  idempotencyKey: string,
  database: Database = db,
): Promise<SkillEvalRunRef | null> {
  const rows = await database
    .select({
      id: skillEvalRunsTable.id,
      status: skillEvalRunsTable.status,
    })
    .from(skillEvalRunsTable)
    .where(eq(skillEvalRunsTable.idempotencyKey, idempotencyKey))
    .limit(1);

  return rows[0] ?? null;
}

export async function insertRun(
  input: InsertSkillEvalRunInput,
  database: Database = db,
): Promise<SkillEvalRunRef> {
  const rows = await database
    .insert(skillEvalRunsTable)
    .values({
      agentId: asSandboxAgentId(input.agentId),
      artifactPrefix: input.artifactPrefix,
      createdBy: asUserId(input.createdBy) as UserId,
      id: asSkillEvalRunId(input.id),
      idempotencyKey: input.idempotencyKey ?? null,
      limitsJson: JSON.stringify(input.limits),
      networkJson: JSON.stringify(input.network),
      policyVersion: input.policyVersion,
      skillId: input.skillId as SkillId,
      snapshotId: input.snapshotId,
      status: input.status,
      suiteId: input.suiteId as SkillEvalSuiteId,
      totalCases: input.totalCases,
    })
    .returning({
      id: skillEvalRunsTable.id,
      status: skillEvalRunsTable.status,
    });

  const [run] = rows;
  if (!run) {
    throw new Error("Failed to create skill eval run.");
  }
  return run;
}

const terminalRunStatuses = new Set<SkillEvalRunRef["status"]>([
  "blocked",
  "cancelled",
  "fail",
  "pass",
]);

const allowedRunStatusTransitions: Record<
  SkillEvalRunRef["status"],
  Set<SkillEvalRunRef["status"]>
> = {
  blocked: new Set(),
  cancelled: new Set(),
  fail: new Set(),
  pass: new Set(),
  pending: new Set(["queued", "running", "pass", "fail", "blocked", "cancelled"]),
  queued: new Set(["running", "pass", "fail", "blocked", "cancelled"]),
  running: new Set(["pass", "fail", "blocked", "cancelled"]),
};

export const canTransitionRunStatus = (
  current: SkillEvalRunRef["status"],
  next: SkillEvalRunRef["status"],
) =>
  current !== next &&
  !terminalRunStatuses.has(current) &&
  allowedRunStatusTransitions[current].has(next);

export async function updateRunStatus(
  input: UpdateSkillEvalRunStatusInput,
  database: Database = db,
): Promise<SkillEvalRunStatusUpdateResult | null> {
  const rows = await database
    .select({
      id: skillEvalRunsTable.id,
      status: skillEvalRunsTable.status,
    })
    .from(skillEvalRunsTable)
    .where(eq(skillEvalRunsTable.id, input.runId))
    .limit(1);
  const current = rows[0] ?? null;
  if (!current) {
    return null;
  }

  if (!canTransitionRunStatus(current.status, input.status)) {
    return {
      ...current,
      changed: false,
    };
  }

  const now = Date.now();
  const set: Partial<typeof skillEvalRunsTable.$inferInsert> = {
    status: input.status,
    syncTime: now,
  };
  if (input.status === "queued") {
    set.queuedAt = now;
  }
  if (input.status === "running") {
    set.startedAt = now;
  }
  if (terminalRunStatuses.has(input.status)) {
    set.completedAt = input.completedAt ?? now;
  }
  if (input.errorCode !== undefined) {
    set.errorCode = input.errorCode;
  }
  if (input.errorMessage !== undefined) {
    set.errorMessage = input.errorMessage;
  }

  await database.update(skillEvalRunsTable).set(set).where(eq(skillEvalRunsTable.id, input.runId));

  return {
    changed: true,
    id: current.id,
    status: input.status,
  };
}

export async function listRunsBySkill(
  input: {
    cursor?: SkillEvalRunCursor | null;
    limit?: number;
    skillId: string;
    snapshotId?: string;
  },
  database: Database = db,
): Promise<SkillEvalRunHistoryPage> {
  const limit = input.limit ?? 20;
  const conditions = [eq(skillEvalRunsTable.skillId, input.skillId as SkillId)];
  if (input.snapshotId) {
    conditions.push(eq(skillEvalRunsTable.snapshotId, asSnapshotId(input.snapshotId)));
  }
  if (input.cursor) {
    conditions.push(
      or(
        lt(skillEvalRunsTable.syncTime, input.cursor.syncTime),
        and(
          eq(skillEvalRunsTable.syncTime, input.cursor.syncTime),
          lt(skillEvalRunsTable.id, asSkillEvalRunId(input.cursor.id)),
        ),
      ) as never,
    );
  }

  const rows = await database
    .select({
      agentDisplayName: sandboxAgentsTable.displayName,
      agentId: sandboxAgentsTable.id,
      agentProvider: sandboxAgentsTable.provider,
      blockedCases: skillEvalRunsTable.blockedCases,
      completedAt: skillEvalRunsTable.completedAt,
      createdAt: skillEvalRunsTable.createdAt,
      failedCases: skillEvalRunsTable.failedCases,
      id: skillEvalRunsTable.id,
      passedCases: skillEvalRunsTable.passedCases,
      skillId: skillEvalRunsTable.skillId,
      snapshotId: skillEvalRunsTable.snapshotId,
      snapshotVersion: snapshotsTable.version,
      status: skillEvalRunsTable.status,
      syncTime: skillEvalRunsTable.syncTime,
      tokenCount: skillEvalRunsTable.tokenCount,
      totalCases: skillEvalRunsTable.totalCases,
      totalDurationMs: skillEvalRunsTable.totalDurationMs,
    })
    .from(skillEvalRunsTable)
    .innerJoin(sandboxAgentsTable, eq(sandboxAgentsTable.id, skillEvalRunsTable.agentId))
    .innerJoin(snapshotsTable, eq(snapshotsTable.id, skillEvalRunsTable.snapshotId))
    .where(and(...conditions))
    .orderBy(desc(skillEvalRunsTable.syncTime), desc(skillEvalRunsTable.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const next = page.at(-1) ?? null;
  return {
    isDone: rows.length <= limit,
    nextCursor:
      rows.length > limit && next
        ? {
            id: next.id,
            syncTime: next.syncTime,
          }
        : null,
    page,
  };
}

const selectRunDetailFields = {
  agentDisplayName: sandboxAgentsTable.displayName,
  agentId: sandboxAgentsTable.id,
  agentProvider: sandboxAgentsTable.provider,
  artifactPrefix: skillEvalRunsTable.artifactPrefix,
  blockedCases: skillEvalRunsTable.blockedCases,
  completedAt: skillEvalRunsTable.completedAt,
  createdAt: skillEvalRunsTable.createdAt,
  createdBy: skillEvalRunsTable.createdBy,
  errorCode: skillEvalRunsTable.errorCode,
  errorMessage: skillEvalRunsTable.errorMessage,
  failedCases: skillEvalRunsTable.failedCases,
  id: skillEvalRunsTable.id,
  limitsJson: skillEvalRunsTable.limitsJson,
  networkJson: skillEvalRunsTable.networkJson,
  passedCases: skillEvalRunsTable.passedCases,
  policyVersion: skillEvalRunsTable.policyVersion,
  skillId: skillEvalRunsTable.skillId,
  snapshotId: skillEvalRunsTable.snapshotId,
  snapshotVersion: snapshotsTable.version,
  status: skillEvalRunsTable.status,
  suiteId: skillEvalRunsTable.suiteId,
  syncTime: skillEvalRunsTable.syncTime,
  tokenCount: skillEvalRunsTable.tokenCount,
  totalCases: skillEvalRunsTable.totalCases,
  totalDurationMs: skillEvalRunsTable.totalDurationMs,
} as const;

export async function getRunDetailById(
  runId: SkillEvalRunId,
  database: Database = db,
): Promise<SkillEvalRunDetailRow | null> {
  const rows = await database
    .select(selectRunDetailFields)
    .from(skillEvalRunsTable)
    .innerJoin(sandboxAgentsTable, eq(sandboxAgentsTable.id, skillEvalRunsTable.agentId))
    .innerJoin(snapshotsTable, eq(snapshotsTable.id, skillEvalRunsTable.snapshotId))
    .where(eq(skillEvalRunsTable.id, runId))
    .limit(1);

  return rows[0] ?? null;
}

export async function listCaseResultsByRun(
  runId: SkillEvalRunId,
  database: Database = db,
): Promise<SkillEvalCaseResultRow[]> {
  return await database
    .select({
      baselineArtifactsJson: skillEvalCaseResultsTable.baselineArtifactsJson,
      baselineDurationMs: skillEvalCaseResultsTable.baselineDurationMs,
      baselineErrorCode: skillEvalCaseResultsTable.errorCode,
      baselineErrorMessage: skillEvalCaseResultsTable.errorMessage,
      baselineExitCode: skillEvalCaseResultsTable.baselineExitCode,
      baselineOutputPreview: skillEvalCaseResultsTable.baselineOutputPreview,
      baselineScore: skillEvalCaseResultsTable.baselineScore,
      baselineStatus: skillEvalCaseResultsTable.baselineStatus,
      baselineTokenCount: skillEvalCaseResultsTable.baselineTokenCount,
      caseId: skillEvalCasesTable.caseId,
      id: skillEvalCaseResultsTable.id,
      runId: skillEvalCaseResultsTable.runId,
      status: skillEvalCaseResultsTable.status,
      summary: skillEvalCaseResultsTable.summary,
      withSkillArtifactsJson: skillEvalCaseResultsTable.withSkillArtifactsJson,
      withSkillDurationMs: skillEvalCaseResultsTable.withSkillDurationMs,
      withSkillErrorCode: skillEvalCaseResultsTable.errorCode,
      withSkillErrorMessage: skillEvalCaseResultsTable.errorMessage,
      withSkillExitCode: skillEvalCaseResultsTable.withSkillExitCode,
      withSkillOutputPreview: skillEvalCaseResultsTable.withSkillOutputPreview,
      withSkillScore: skillEvalCaseResultsTable.withSkillScore,
      withSkillStatus: skillEvalCaseResultsTable.withSkillStatus,
      withSkillTokenCount: skillEvalCaseResultsTable.withSkillTokenCount,
    })
    .from(skillEvalCaseResultsTable)
    .innerJoin(skillEvalCasesTable, eq(skillEvalCasesTable.id, skillEvalCaseResultsTable.caseId))
    .where(eq(skillEvalCaseResultsTable.runId, runId))
    .orderBy(asc(skillEvalCasesTable.sortOrder), asc(skillEvalCasesTable.caseId));
}

const parseJsonArray = (value: string): string[] => {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed.map(String) : [];
};

export async function upsertSuiteWithCases(
  input: UpsertSkillEvalSuiteInput,
  database: Database = db,
): Promise<StoredSkillEvalSuite> {
  const suiteId = asSkillEvalSuiteId(createId());
  const suiteRows = await database
    .insert(skillEvalSuitesTable)
    .values({
      caseCount: input.caseCount,
      evalPath: input.evalPath,
      fingerprint: input.fingerprint,
      id: suiteId,
      skillId: input.skillId as SkillId,
      snapshotId: input.snapshotId,
      status: input.status,
      validationErrorsJson: JSON.stringify(input.validationErrors),
    })
    .onConflictDoUpdate({
      target: [
        skillEvalSuitesTable.snapshotId,
        skillEvalSuitesTable.evalPath,
        skillEvalSuitesTable.fingerprint,
      ],
      set: {
        caseCount: sql`excluded.case_count`,
        status: sql`excluded.status`,
        syncTime: sql`unixepoch() * 1000`,
        validationErrorsJson: sql`excluded.validation_errors_json`,
      },
    })
    .returning({
      caseCount: skillEvalSuitesTable.caseCount,
      evalPath: skillEvalSuitesTable.evalPath,
      fingerprint: skillEvalSuitesTable.fingerprint,
      id: skillEvalSuitesTable.id,
      skillId: skillEvalSuitesTable.skillId,
      snapshotId: skillEvalSuitesTable.snapshotId,
      status: skillEvalSuitesTable.status,
      syncTime: skillEvalSuitesTable.syncTime,
      validationErrorsJson: skillEvalSuitesTable.validationErrorsJson,
    });
  const suite = suiteRows[0] ?? {
    caseCount: input.caseCount,
    evalPath: input.evalPath,
    fingerprint: input.fingerprint,
    id: suiteId,
    skillId: input.skillId as SkillId,
    snapshotId: input.snapshotId,
    status: input.status,
    syncTime: Date.now(),
    validationErrorsJson: JSON.stringify(input.validationErrors),
  };

  if (input.cases.length > 0) {
    await database
      .insert(skillEvalCasesTable)
      .values(
        input.cases.map((caseItem) => ({
          assertionsJson: JSON.stringify(caseItem.assertions),
          caseId: caseItem.caseId,
          expectedOutput: caseItem.expectedOutput,
          fingerprint: caseItem.fingerprint,
          fixturePathsJson: JSON.stringify(caseItem.fixturePaths),
          id: asSkillEvalCaseId(createId()),
          prompt: caseItem.prompt,
          promptPreview: caseItem.promptPreview,
          skillId: suite.skillId,
          snapshotId: suite.snapshotId,
          sortOrder: caseItem.sortOrder,
          suiteId: suite.id,
          title: caseItem.title,
        })),
      )
      .onConflictDoUpdate({
        target: [skillEvalCasesTable.suiteId, skillEvalCasesTable.caseId],
        set: {
          assertionsJson: sql`excluded.assertions_json`,
          expectedOutput: sql`excluded.expected_output`,
          fingerprint: sql`excluded.fingerprint`,
          fixturePathsJson: sql`excluded.fixture_paths_json`,
          prompt: sql`excluded.prompt`,
          promptPreview: sql`excluded.prompt_preview`,
          sortOrder: sql`excluded.sort_order`,
          syncTime: sql`unixepoch() * 1000`,
          title: sql`excluded.title`,
        },
      });
  }

  const caseRows =
    input.cases.length > 0
      ? await database
          .select({
            assertionsJson: skillEvalCasesTable.assertionsJson,
            caseId: skillEvalCasesTable.caseId,
            expectedOutput: skillEvalCasesTable.expectedOutput,
            fingerprint: skillEvalCasesTable.fingerprint,
            fixturePathsJson: skillEvalCasesTable.fixturePathsJson,
            id: skillEvalCasesTable.id,
            promptPreview: skillEvalCasesTable.promptPreview,
            sortOrder: skillEvalCasesTable.sortOrder,
            syncTime: skillEvalCasesTable.syncTime,
            title: skillEvalCasesTable.title,
          })
          .from(skillEvalCasesTable)
          .where(eq(skillEvalCasesTable.suiteId, suite.id))
          .orderBy(asc(skillEvalCasesTable.sortOrder), asc(skillEvalCasesTable.caseId))
      : [];

  return {
    caseCount: suite.caseCount,
    cases: caseRows.map((caseItem) => ({
      assertions: parseJsonArray(caseItem.assertionsJson),
      caseId: caseItem.caseId,
      expectedOutput: caseItem.expectedOutput,
      fingerprint: caseItem.fingerprint,
      fixturePaths: parseJsonArray(caseItem.fixturePathsJson),
      id: caseItem.id,
      promptPreview: caseItem.promptPreview,
      sortOrder: caseItem.sortOrder,
      syncTime: caseItem.syncTime,
      title: caseItem.title,
    })),
    evalPath: suite.evalPath,
    fingerprint: suite.fingerprint,
    id: suite.id,
    skillId: suite.skillId,
    snapshotId: suite.snapshotId,
    status: suite.status,
    syncTime: suite.syncTime,
    validationErrors: parseJsonArray(suite.validationErrorsJson),
  };
}

export const skillEvalSandboxRepo = {
  canTransitionRunStatus,
  findRunByIdempotencyKey,
  getRunDetailById,
  getRunnableSkillById,
  insertRun,
  listCaseResultsByRun,
  listActiveAgents,
  listRunsBySkill,
  updateRunStatus,
  upsertSuiteWithCases,
};
