import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import type { SkillEvalCaseId, SkillEvalSuiteId, SkillId, SnapshotId } from "../utils";
import { baseTableColumns, currentTimestampMs } from "../utils";
import { skillsTable } from "./skills";
import { snapshotsTable } from "./snapshots";

export const skillEvalSuitesTable = sqliteTable(
  "skill_eval_suites",
  {
    ...baseTableColumns<SkillEvalSuiteId>(),
    caseCount: integer("case_count").notNull().default(0),
    evalPath: text("eval_path").notNull(),
    fingerprint: text("fingerprint").notNull(),
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
    status: text("status", {
      enum: ["valid", "invalid", "missing"],
    }).notNull(),
    syncTime: integer("sync_time").default(currentTimestampMs).notNull(),
    validationErrorsJson: text("validation_errors_json").notNull().default("[]"),
  },
  (table) => [
    index("skill_eval_suites_skill_snapshot_idx").on(table.skillId, table.snapshotId),
    index("skill_eval_suites_status_sync_time_idx").on(table.status, table.syncTime),
    uniqueIndex("skill_eval_suites_snapshot_eval_path_fingerprint_unique").on(
      table.snapshotId,
      table.evalPath,
      table.fingerprint,
    ),
  ],
);

export const skillEvalCasesTable = sqliteTable(
  "skill_eval_cases",
  {
    ...baseTableColumns<SkillEvalCaseId>(),
    assertionsJson: text("assertions_json").notNull().default("[]"),
    caseId: text("case_id").notNull(),
    expectedOutput: text("expected_output"),
    fingerprint: text("fingerprint").notNull(),
    fixturePathsJson: text("fixture_paths_json").notNull().default("[]"),
    prompt: text("prompt").notNull(),
    promptPreview: text("prompt_preview").notNull(),
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
    sortOrder: integer("sort_order").notNull().default(0),
    suiteId: text("suite_id")
      .$type<SkillEvalSuiteId>()
      .notNull()
      .references(() => skillEvalSuitesTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    syncTime: integer("sync_time").default(currentTimestampMs).notNull(),
    title: text("title"),
  },
  (table) => [
    index("skill_eval_cases_suite_sort_order_idx").on(table.suiteId, table.sortOrder),
    index("skill_eval_cases_skill_snapshot_idx").on(table.skillId, table.snapshotId),
    index("skill_eval_cases_fingerprint_idx").on(table.fingerprint),
    uniqueIndex("skill_eval_cases_suite_case_id_unique").on(table.suiteId, table.caseId),
  ],
);
