import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import type {
  SandboxAgentId,
  SkillEvalCaseId,
  SkillEvalCaseResultId,
  SkillEvalRunId,
  SkillEvalSuiteId,
  SkillId,
  SnapshotId,
  UserId,
} from "../utils";
import { baseTableColumns, currentTimestampMs } from "../utils";
import { sandboxAgentsTable } from "./sandbox-agents";
import { skillsTable } from "./skills";
import { skillEvalCasesTable, skillEvalSuitesTable } from "./skill-eval-suites";
import { snapshotsTable } from "./snapshots";
import { usersTable } from "./auth";

export const skillEvalRunsTable = sqliteTable(
  "skill_eval_runs",
  {
    ...baseTableColumns<SkillEvalRunId>(),
    agentId: text("agent_id")
      .$type<SandboxAgentId>()
      .notNull()
      .references(() => sandboxAgentsTable.id, {
        onDelete: "no action",
        onUpdate: "cascade",
      }),
    artifactPrefix: text("artifact_prefix").notNull(),
    blockedCases: integer("blocked_cases").notNull().default(0),
    completedAt: integer("completed_at"),
    costMicros: integer("cost_micros"),
    createdBy: text("created_by")
      .$type<UserId>()
      .references(() => usersTable.id, {
        onDelete: "set null",
        onUpdate: "cascade",
      }),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    failedCases: integer("failed_cases").notNull().default(0),
    idempotencyKey: text("idempotency_key"),
    limitsJson: text("limits_json").notNull(),
    networkJson: text("network_json").notNull(),
    passedCases: integer("passed_cases").notNull().default(0),
    policyVersion: text("policy_version").notNull(),
    queuedAt: integer("queued_at"),
    skillId: text("skill_id")
      .$type<SkillId>()
      .notNull()
      .references(() => skillsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    snapshotId: text("snapshot_id")
      .$type<SnapshotId>()
      .notNull()
      .references(() => snapshotsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    startedAt: integer("started_at"),
    status: text("status", {
      enum: ["pending", "queued", "running", "pass", "fail", "blocked", "cancelled"],
    })
      .notNull()
      .default("pending"),
    suiteId: text("suite_id")
      .$type<SkillEvalSuiteId>()
      .notNull()
      .references(() => skillEvalSuitesTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    syncTime: integer("sync_time").default(currentTimestampMs).notNull(),
    tokenCount: integer("token_count"),
    totalCases: integer("total_cases").notNull().default(0),
    totalDurationMs: integer("total_duration_ms"),
  },
  (table) => [
    index("skill_eval_runs_skill_sync_time_idx").on(table.skillId, table.syncTime),
    index("skill_eval_runs_snapshot_sync_time_idx").on(table.snapshotId, table.syncTime),
    index("skill_eval_runs_status_sync_time_idx").on(table.status, table.syncTime),
    index("skill_eval_runs_created_by_sync_time_idx").on(table.createdBy, table.syncTime),
    uniqueIndex("skill_eval_runs_idempotency_key_unique").on(table.idempotencyKey),
  ],
);

export const skillEvalCaseResultsTable = sqliteTable(
  "skill_eval_case_results",
  {
    ...baseTableColumns<SkillEvalCaseResultId>(),
    assertionSummaryJson: text("assertion_summary_json").notNull().default("{}"),
    baselineArtifactsJson: text("baseline_artifacts_json"),
    baselineDurationMs: integer("baseline_duration_ms"),
    baselineExitCode: integer("baseline_exit_code"),
    baselineOutputPreview: text("baseline_output_preview"),
    baselineScore: integer("baseline_score"),
    baselineStatus: text("baseline_status", {
      enum: ["pending", "running", "pass", "fail", "blocked"],
    }),
    baselineTokenCount: integer("baseline_token_count"),
    caseId: text("case_id")
      .$type<SkillEvalCaseId>()
      .notNull()
      .references(() => skillEvalCasesTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    runId: text("run_id")
      .$type<SkillEvalRunId>()
      .notNull()
      .references(() => skillEvalRunsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    status: text("status", {
      enum: ["pending", "running", "pass", "fail", "blocked"],
    })
      .notNull()
      .default("pending"),
    summary: text("summary"),
    syncTime: integer("sync_time").default(currentTimestampMs).notNull(),
    withSkillArtifactsJson: text("with_skill_artifacts_json"),
    withSkillDurationMs: integer("with_skill_duration_ms"),
    withSkillExitCode: integer("with_skill_exit_code"),
    withSkillOutputPreview: text("with_skill_output_preview"),
    withSkillScore: integer("with_skill_score"),
    withSkillStatus: text("with_skill_status", {
      enum: ["pending", "running", "pass", "fail", "blocked"],
    })
      .notNull()
      .default("pending"),
    withSkillTokenCount: integer("with_skill_token_count"),
  },
  (table) => [
    index("skill_eval_case_results_run_status_idx").on(table.runId, table.status),
    index("skill_eval_case_results_case_idx").on(table.caseId),
    uniqueIndex("skill_eval_case_results_run_case_unique").on(table.runId, table.caseId),
  ],
);
