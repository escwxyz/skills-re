import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import type { SandboxAgentId } from "../utils";
import { baseTableColumns, currentTimestampMs } from "../utils";

export const sandboxAgentsTable = sqliteTable(
  "sandbox_agents",
  {
    ...baseTableColumns<SandboxAgentId>(),
    adapterId: text("adapter_id").notNull(),
    capabilitiesJson: text("capabilities_json").notNull(),
    defaultLimitsJson: text("default_limits_json").notNull(),
    description: text("description"),
    displayName: text("display_name").notNull(),
    provider: text("provider").notNull(),
    runtimeFamily: text("runtime_family").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", {
      enum: ["active", "deprecated", "disabled"],
    })
      .notNull()
      .default("active"),
    syncTime: integer("sync_time").default(currentTimestampMs).notNull(),
  },
  (table) => [
    index("sandbox_agents_status_sort_order_idx").on(table.status, table.sortOrder),
    index("sandbox_agents_provider_runtime_idx").on(table.provider, table.runtimeFamily),
    uniqueIndex("sandbox_agents_adapter_id_unique").on(table.adapterId),
  ],
);
