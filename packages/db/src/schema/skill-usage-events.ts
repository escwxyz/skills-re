import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { SkillId, SkillUsageEventId, UserId } from "../utils";
import { baseTableColumns } from "../utils";
import { usersTable } from "./auth";
import { skillsTable } from "./skills";

export const skillUsageEventsTable = sqliteTable(
  "skill_usage_events",
  {
    ...baseTableColumns<SkillUsageEventId>(),
    agentName: text("agent_name"),
    projectContext: text("project_context"),
    skillId: text("skill_id")
      .$type<SkillId | null>()
      .references(() => skillsTable.id, { onDelete: "set null", onUpdate: "cascade" }),
    skillPath: text("skill_path"),
    skillSlug: text("skill_slug").notNull(),
    taskDescription: text("task_description"),
    userId: text("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade", onUpdate: "cascade" }),
    usedAt: integer("used_at").notNull(),
  },
  (table) => [
    index("skill_usage_events_user_id_used_at_idx").on(table.userId, table.usedAt),
    index("skill_usage_events_skill_id_idx").on(table.skillId),
    index("skill_usage_events_skill_slug_idx").on(table.skillSlug),
  ],
);
