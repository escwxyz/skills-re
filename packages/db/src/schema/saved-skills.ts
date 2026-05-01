import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import type { SavedSkillId, SkillId, UserId } from "../utils";
import { baseTableColumns } from "../utils";
import { usersTable } from "./auth";
import { skillsTable } from "./skills";

export const savedSkillsTable = sqliteTable(
  "saved_skills",
  {
    ...baseTableColumns<SavedSkillId>(),
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
    uniqueIndex("saved_skills_user_id_skill_id_unique").on(table.userId, table.skillId),
    index("saved_skills_user_id_idx").on(table.userId),
    index("saved_skills_skill_id_idx").on(table.skillId),
    index("saved_skills_created_at_idx").on(table.createdAt),
  ],
);
