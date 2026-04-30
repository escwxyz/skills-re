import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { currentTimestampMs } from "../utils";

export const categoryCountsTable = sqliteTable(
  "category_counts",
  {
    count: integer("count").default(0).notNull(),
    slug: text("slug").primaryKey(),
    updatedAt: integer("updated_at").default(currentTimestampMs).notNull(),
  },
  (table) => [check("category_counts_count_non_negative", sql`${table.count} >= 0`)],
);
