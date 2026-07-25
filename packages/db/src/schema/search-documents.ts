import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import type { SkillId, SnapshotId } from "../utils";
import { currentTimestampMs } from "../utils";
import { skillsTable } from "./skills";
import { snapshotsTable } from "./snapshots";

export const skillSearchDocumentsTable = sqliteTable(
  "skill_search_documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    authorHandle: text("author_handle").notNull(),
    body: text("body").notNull(),
    bodySizeBytes: integer("body_size_bytes").notNull(),
    contentHash: text("content_hash").notNull(),
    description: text("description").notNull(),
    indexingStatus: text("indexing_status").notNull().default("indexed"),
    maxIndexedBodyBytes: integer("max_indexed_body_bytes").notNull(),
    repository: text("repository").notNull(),
    skillId: text("skill_id")
      .$type<SkillId>()
      .notNull()
      .references(() => skillsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    slug: text("slug").notNull(),
    snapshotId: text("snapshot_id")
      .$type<SnapshotId>()
      .notNull()
      .references(() => snapshotsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    tags: text("tags").notNull().default(""),
    title: text("title").notNull(),
    updatedAt: integer("updated_at").default(currentTimestampMs).notNull(),
  },
  (table) => [
    check("skill_search_documents_body_size_non_negative", sql`${table.bodySizeBytes} >= 0`),
    check(
      "skill_search_documents_max_indexed_body_bytes_positive",
      sql`${table.maxIndexedBodyBytes} > 0`,
    ),
    check(
      "skill_search_documents_indexing_status_valid",
      sql`${table.indexingStatus} in ('indexed', 'truncated')`,
    ),
    index("skill_search_documents_snapshot_id_idx").on(table.snapshotId),
    index("skill_search_documents_updated_at_id_idx").on(table.updatedAt, table.id),
    uniqueIndex("skill_search_documents_skill_id_unique").on(table.skillId),
  ],
);
