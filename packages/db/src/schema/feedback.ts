import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { FeedbackId, UserId } from "../utils";
import { createId, currentTimestampMs } from "../utils";

export const feedbackTable = sqliteTable(
  "feedback",
  {
    content: text("content").notNull(),
    createdAt: integer("created_at").default(currentTimestampMs).notNull(),
    id: text("id")
      .$type<FeedbackId>()
      .$defaultFn(() => createId() as FeedbackId)
      .primaryKey(),
    response: text("response"),
    status: text("status", { enum: ["pending", "resolved", "in_review"] })
      .notNull()
      .default("pending"),
    title: text("title").notNull(),
    type: text("type", { enum: ["bug", "request", "general"] })
      .notNull()
      .default("general"),
    updatedAt: integer("updated_at").default(currentTimestampMs).notNull(),
    userId: text("user_id").$type<UserId | null>(),
  },
  (table) => [
    index("feedback_status_idx").on(table.status),
    index("feedback_type_idx").on(table.type),
    index("feedback_user_id_idx").on(table.userId),
  ],
);
