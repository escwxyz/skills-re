import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import type { TagId } from "../utils";
import { baseTableColumns } from "../utils";

export const tagsTable = sqliteTable(
  "tags",
  {
    ...baseTableColumns<TagId>(),
    count: integer("count").default(0).notNull(),
    promotedAt: integer("promoted_at"),
    slug: text("slug").notNull(),
    status: text("status", {
      enum: ["active", "pending"],
    })
      .notNull()
      .default("active"),
  },
  (table) => [
    check("count_non_negative", sql`${table.count} >= 0`),
    uniqueIndex("tags_slug_unique").on(table.slug),
    index("tags_count_slug_idx").on(table.count, table.slug),
    index("tags_status_count_slug_idx").on(table.status, table.count, table.slug),
  ],
);
