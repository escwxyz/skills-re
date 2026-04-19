import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import type { RepoId } from "../utils";
import { baseTableColumns, currentTimestampMs } from "../utils";
import { skillsTable } from "./skills";

export const reposTable = sqliteTable(
  "repos",
  {
    ...baseTableColumns<RepoId>(),
    defaultBranch: text("default_branch").notNull(),
    forks: integer("forks").default(0).notNull(),
    license: text("license"),
    name: text("name").notNull(),
    nameWithOwner: text("name_with_owner").notNull(),
    ownerAvatarUrl: text("owner_avatar_url"),
    ownerHandle: text("owner_handle").notNull(),
    ownerName: text("owner_name"),
    stars: integer("stars").default(0).notNull(),
    syncTime: integer("sync_time").default(currentTimestampMs).notNull(),
    updatedAt: integer("updated_at").default(currentTimestampMs).notNull(),
    url: text("url"),
  },
  (table) => [
    index("repos_ownerHandle_idx").on(table.ownerHandle),
    uniqueIndex("repos_nameWithOwner_unique").on(table.nameWithOwner),
  ],
);

export const reposRelations = relations(reposTable, ({ many }) => ({
  skills: many(skillsTable),
}));
