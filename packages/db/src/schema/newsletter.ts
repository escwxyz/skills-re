import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { NewsletterId } from "../utils";
import { createId, currentTimestampMs } from "../utils";

export const newsletterTable = sqliteTable(
  "newsletter",
  {
    city: text("city"),
    country: text("country"),
    createdAt: integer("created_at").default(currentTimestampMs).notNull(),
    device: text("device", { enum: ["mobile", "desktop"] }),
    email: text("email").notNull().unique(),
    id: text("id")
      .$type<NewsletterId>()
      .$defaultFn(() => createId() as NewsletterId)
      .primaryKey(),
    ip: text("ip"),
  },
  (table) => [index("newsletter_created_at_idx").on(table.createdAt)],
);
