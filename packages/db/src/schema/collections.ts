import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import type { CollectionId, SkillId, UserId } from "../utils";
import { baseTableColumns } from "../utils";
import { usersTable } from "./auth";
import { skillsTable } from "./skills";

export const collectionsTable = sqliteTable(
  "collections",
  {
    ...baseTableColumns<CollectionId>(),
    description: text("description").notNull(),
    slug: text("slug").notNull(),
    status: text("status", { enum: ["active", "archived"] })
      .notNull()
      .default("active"),
    title: text("title").notNull(),
    userId: text("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    uniqueIndex("collections_slug_unique").on(table.slug),
    index("collections_status_idx").on(table.status),
    index("collections_status_created_at_idx").on(table.status, table.createdAt),
    index("collections_user_id_idx").on(table.userId),
  ],
);

export const collectionsSkillsTable = sqliteTable(
  "collections_skills",
  {
    collectionId: text("collection_id")
      .$type<CollectionId>()
      .notNull()
      .references(() => collectionsTable.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .$type<SkillId>()
      .notNull()
      .references(() => skillsTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    uniqueIndex("collections_skills_unique").on(table.collectionId, table.skillId),
    index("collections_skills_collection_id_idx").on(table.collectionId),
  ],
);
