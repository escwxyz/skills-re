import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import type { ReviewId, SkillId, UserId } from "../utils";
import { baseTableColumns } from "../utils";
import { skillsTable } from "./skills";
import { usersTable } from "./auth";

export const reviewsTable = sqliteTable(
  "reviews",
  {
    ...baseTableColumns<ReviewId>(),
    content: text("content").notNull(),
    rating: integer("rating").notNull(),
    skillId: text("skill_id")
      .$type<SkillId>()
      .notNull()
      .references(() => skillsTable.id, { onDelete: "cascade", onUpdate: "cascade" }),
    userId: text("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    check("reviews_rating_range", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
    index("reviews_skill_id_created_at_idx").on(table.skillId, table.createdAt),
    index("reviews_user_id_created_at_idx").on(table.userId, table.createdAt),
    uniqueIndex("reviews_skill_id_user_id_unique").on(table.skillId, table.userId),
  ],
);
