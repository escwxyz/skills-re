import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import type { EvaluationId, RepoId, SkillId, SnapshotId, TagId, UserId } from "../utils";

import { baseTableColumns, currentTimestampMs } from "../utils";
import { reposTable } from "./repos";
import { usersTable } from "./auth";
import { tagsTable } from "./tags";

export const skillsTable = sqliteTable(
  "skills",
  {
    ...baseTableColumns<SkillId>(),
    createdAt: integer("created_at").default(currentTimestampMs).notNull(),
    description: text("description").notNull(),
    downloadsAllTime: integer("downloads_all_time").default(0).notNull(),
    downloadsTrending: integer("downloads_trending").default(0).notNull(),
    isVerified: integer("is_verified", { mode: "boolean" }).default(false).notNull(),
    latestVersion: text("latest_version"),
    primaryCategory: text("primary_category"),
    repoId: text("repo_id")
      .$type<RepoId>()
      .notNull()
      .references(() => reposTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .$type<UserId | null>()
      .references(() => usersTable.id, {
        onDelete: "set null",
        onUpdate: "cascade",
      }),
    latestEvaluationId: text("latest_evaluation_id").$type<EvaluationId>(),
    latestSnapshotId: text("latest_snapshot_id").$type<SnapshotId>(),
    latestCommitSha: text("latest_commit_sha"),
    latestCommitUrl: text("latest_commit_url"),
    latestCommitDate: integer("latest_commit_date"),
    latestCommitMessage: text("latest_commit_message"),
    aiSearchItemId: text("ai_search_item_id"),
    slug: text("slug").notNull(),
    stargazerCount: integer("stargazer_count").default(0).notNull(),
    syncTime: integer("sync_time").default(currentTimestampMs).notNull(),
    title: text("title").notNull(),
    updatedAt: integer("updated_at").default(currentTimestampMs).notNull(),
    viewsAllTime: integer("views_all_time").default(0).notNull(),
    visibility: text("visibility").notNull().default("public"),
  },
  (table) => [
    check("skills_downloads_all_time_non_negative", sql`${table.downloadsAllTime} >= 0`),
    check(
      "skills_created_at_ms_non_negative",
      sql`${table.createdAt} is null or ${table.createdAt} >= 0`,
    ),
    check("skills_sync_time_non_negative", sql`${table.syncTime} >= 0`),
    index("skills_createdAt_id_idx").on(table.createdAt, table.id),
    index("skills_repoId_idx").on(table.repoId),
    index("skills_userId_idx").on(table.userId),
    index("skills_latest_evaluation_id_idx").on(table.latestEvaluationId),
    index("skills_latest_snapshot_id_idx").on(table.latestSnapshotId),
    index("skills_latest_commit_date_idx").on(table.latestCommitDate),
    index("skills_ai_search_item_id_idx").on(table.aiSearchItemId),
    index("skills_visibility_syncTime_id_idx").on(table.visibility, table.syncTime, table.id),
    index("skills_slug_idx").on(table.slug),
    index("skills_syncTime_idx").on(table.syncTime),
    uniqueIndex("skills_repo_id_slug_unique").on(table.repoId, table.slug),
    uniqueIndex("skills_slug_unique").on(table.slug),
  ],
);

export const skillsTagsTable = sqliteTable(
  "skills_tags",
  {
    skillId: text("skill_id")
      .$type<SkillId>()
      .notNull()
      .references(() => skillsTable.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .$type<TagId>()
      .notNull()
      .references(() => tagsTable.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("skills_tags_unique").on(table.skillId, table.tagId)],
);
