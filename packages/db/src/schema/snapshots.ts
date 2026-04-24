import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { EvaluationId, SnapshotId, SkillId } from "../utils";
import { currentTimestampMs, idColumn } from "../utils";
import { skillsTable } from "./skills";

// Snapshots are the base layer for skill history, archive downloads, and replayed commits.
export const snapshotsTable = sqliteTable(
  "snapshots",
  {
    archiveR2Key: text("archive_r2_key"),
    createdAtMs: integer("created_at_ms").default(currentTimestampMs).notNull(),
    description: text("description").notNull(),
    directoryPath: text("directory_path").notNull(),
    entryPath: text("entry_path").notNull(),
    evaluationId: text("evaluation_id").$type<EvaluationId>(),
    frontmatterHash: text("frontmatter_hash"),
    hash: text("hash").notNull(),
    id: idColumn<SnapshotId>(),
    isDeprecated: integer("is_deprecated", { mode: "boolean" }).default(false).notNull(),
    name: text("name").notNull(),
    skillContentHash: text("skill_content_hash"),
    skillId: text("skill_id")
      .$type<SkillId>()
      .notNull()
      .references(() => skillsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    sourceCommitDate: integer("source_commit_date"),
    sourceCommitMessage: text("source_commit_message"),
    sourceCommitSha: text("source_commit_sha"),
    sourceCommitUrl: text("source_commit_url"),
    syncTime: integer("sync_time").default(currentTimestampMs).notNull(),
    version: text("version").notNull(),
  },
  (table) => [
    index("snapshots_createdAtMs_id_idx").on(table.createdAtMs, table.id),
    index("snapshots_evaluationId_idx").on(table.evaluationId),
    index("snapshots_frontmatter_skillContentHash_idx").on(
      table.frontmatterHash,
      table.skillContentHash,
    ),
    index("snapshots_skill_deprecated_syncTime_idx").on(
      table.skillId,
      table.isDeprecated,
      table.syncTime,
    ),
    index("snapshots_skill_syncTime_id_idx").on(table.skillId, table.syncTime, table.id),
    index("snapshots_skill_version_syncTime_idx").on(table.skillId, table.version, table.syncTime),
  ],
);

export const snapshotFilesTable = sqliteTable(
  "snapshot_files",
  {
    contentType: text("content_type"),
    fileHash: text("file_hash").notNull(),
    path: text("path").notNull(),
    r2Key: text("r2_key"),
    size: integer("size").notNull(),
    snapshotId: text("snapshot_id")
      .$type<SnapshotId>()
      .notNull()
      .references(() => snapshotsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    sourceSha: text("source_sha"),
  },
  (table) => [
    index("snapshot_files_snapshotId_idx").on(table.snapshotId),
    primaryKey({
      columns: [table.snapshotId, table.path],
      name: "snapshot_files_pk",
    }),
  ],
);
