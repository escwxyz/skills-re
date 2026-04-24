import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { SnapshotId, StaticAuditId } from "../utils";
import { createId, currentTimestampMs } from "../utils";
import { snapshotsTable } from "./snapshots";

export const staticAuditsTable = sqliteTable(
  "static_audits",
  {
    auditJson: text("audit_json").notNull(),
    entryPath: text("entry_path"),
    filesScanned: integer("files_scanned").notNull().default(0),
    findingsJson: text("findings_json").notNull(),
    generatedAt: integer("generated_at").notNull(),
    id: text("id")
      .$type<StaticAuditId>()
      .$defaultFn(() => createId() as StaticAuditId)
      .primaryKey(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    isBlocked: integer("is_blocked", { mode: "boolean" }).notNull(),
    modelVersion: text("model_version"),
    overallScore: integer("overall_score").notNull(),
    pipeline: text("pipeline").notNull(),
    pipelineRunId: text("pipeline_run_id").notNull(),
    reason: text("reason"),
    repoName: text("repo_name").notNull(),
    repoOwner: text("repo_owner").notNull(),
    reportR2Key: text("report_r2_key"),
    riskFactorsJson: text("risk_factors_json").notNull(),
    riskLevel: text("risk_level", {
      enum: ["safe", "low", "medium", "high", "critical"],
    }).notNull(),
    rulesVersion: text("rules_version").notNull(),
    safeToPublish: integer("safe_to_publish", { mode: "boolean" }).notNull(),
    skillRootPath: text("skill_root_path"),
    snapshotId: text("snapshot_id")
      .$type<SnapshotId>()
      .references(() => snapshotsTable.id, {
        onDelete: "set null",
        onUpdate: "cascade",
      }),
    sourceHash: text("source_hash").notNull(),
    sourceRef: text("source_ref"),
    sourceType: text("source_type").notNull(),
    status: text("status", { enum: ["pass", "fail"] }).notNull(),
    summary: text("summary").notNull(),
    syncTime: integer("sync_time").notNull().default(currentTimestampMs),
    totalLines: integer("total_lines").notNull().default(0),
    treeHash: text("tree_hash"),
  },
  (table) => [
    check(
      "static_audits_overall_score_range",
      sql`${table.overallScore} >= 0 AND ${table.overallScore} <= 100`,
    ),
    check("static_audits_files_scanned_non_negative", sql`${table.filesScanned} >= 0`),
    check("static_audits_total_lines_non_negative", sql`${table.totalLines} >= 0`),
    check("static_audits_generated_at_non_negative", sql`${table.generatedAt} >= 0`),
    check("static_audits_sync_time_non_negative", sql`${table.syncTime} >= 0`),
    index("static_audits_snapshot_sync_time_idx").on(table.snapshotId, table.syncTime),
    index("static_audits_repo_sync_time_idx").on(table.repoOwner, table.repoName, table.syncTime),
    index("static_audits_source_hash_rules_version_idx").on(table.sourceHash, table.rulesVersion),
    index("static_audits_risk_level_sync_time_idx").on(table.riskLevel, table.syncTime),
  ],
);
