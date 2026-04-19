import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import type { ChangelogId } from "../utils";
import { createId, currentTimestampMs } from "../utils";

export const changelogsTable = sqliteTable(
  "changelogs",
  {
    changesJson: text("changes_json", { mode: "json" }).$type<string[]>().notNull(),
    createdAt: integer("created_at").default(currentTimestampMs).notNull(),
    description: text("description").notNull(),
    id: text("id")
      .$type<ChangelogId>()
      .$defaultFn(() => createId() as ChangelogId)
      .primaryKey(),
    isPublished: integer("is_published", { mode: "boolean" }).notNull(),
    isStable: integer("is_stable", { mode: "boolean" }).notNull(),
    title: text("title").notNull(),
    type: text("type", { enum: ["feature", "patch", "major"] }).notNull(),
    versionMajor: integer("version_major").notNull(),
    versionMinor: integer("version_minor").notNull(),
    versionPatch: integer("version_patch").notNull(),
  },
  (table) => [
    check("changelogs_version_major_non_negative", sql`${table.versionMajor} >= 0`),
    check("changelogs_version_minor_non_negative", sql`${table.versionMinor} >= 0`),
    check("changelogs_version_patch_non_negative", sql`${table.versionPatch} >= 0`),
    uniqueIndex("changelogs_version_triplet_unique").on(
      table.versionMajor,
      table.versionMinor,
      table.versionPatch,
    ),
    index("changelogs_publish_version_idx").on(
      table.isPublished,
      table.versionMajor,
      table.versionMinor,
      table.versionPatch,
      table.isStable,
    ),
    index("changelogs_version_idx").on(
      table.versionMajor,
      table.versionMinor,
      table.versionPatch,
      table.isStable,
    ),
  ],
);
