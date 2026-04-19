import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { currentTimestampMs } from "../utils";

export const dailyMetricsTable = sqliteTable(
  "daily_metrics",
  {
    day: text("day").primaryKey(),
    newSkills: integer("new_skills").notNull().default(0),
    newSnapshots: integer("new_snapshots").notNull().default(0),
    updatedAtMs: integer("updated_at_ms").notNull().default(currentTimestampMs),
  },
  (table) => [
    check("daily_metrics_new_skills_non_negative", sql`${table.newSkills} >= 0`),
    check("daily_metrics_new_snapshots_non_negative", sql`${table.newSnapshots} >= 0`),
    check("daily_metrics_updated_at_ms_non_negative", sql`${table.updatedAtMs} >= 0`),
  ],
);
