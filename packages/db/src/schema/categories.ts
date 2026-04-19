import { relations } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

import type { CategoryId } from "../utils";
import { baseTableColumns } from "../utils";

export const categoriesTable = sqliteTable(
  "categories",
  {
    ...baseTableColumns<CategoryId>(),
    count: integer("count").default(0).notNull(),
    description: text("description").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    keywords: text("keywords").notNull().default("[]"),
    status: text("status", {
      enum: ["active", "deprecated"],
    })
      .$type<"active" | "deprecated">()
      .notNull()
      .default("active"),
  },
  (table) => [
    check("categories_count_non_negative", sql`${table.count} >= 0`),
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_count_slug_idx").on(table.count, table.slug),
  ],
);

export const categoriesRelations = relations(categoriesTable, () => ({}));
