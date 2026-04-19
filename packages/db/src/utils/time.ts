import { sql } from "drizzle-orm";
import { integer } from "drizzle-orm/sqlite-core";

export const currentTimestampMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const timestampMsColumn = (name: string) => integer(name, { mode: "timestamp_ms" });

export const createdAtColumn = (name = "created_at") =>
  timestampMsColumn(name).default(currentTimestampMs).notNull();

export const updatedAtColumn = (name = "updated_at") =>
  timestampMsColumn(name)
    .default(currentTimestampMs)
    .$onUpdate(() => new Date())
    .notNull();
