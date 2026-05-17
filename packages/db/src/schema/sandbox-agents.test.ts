/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { sandboxAgentsTable } from "./sandbox-agents";

const getExtraConfigNames = () => {
  const builderKey = Object.getOwnPropertySymbols(sandboxAgentsTable).find((symbol) =>
    String(symbol).includes("ExtraConfigBuilder"),
  );
  expect(builderKey).toBeDefined();

  const builders = (
    (sandboxAgentsTable as unknown as Record<symbol, unknown>)[builderKey as symbol] as (
      table: object,
    ) => unknown[]
  )(sandboxAgentsTable);

  return builders
    .map((item) => {
      const typedItem = item as { name?: string; config?: { name?: string } };
      return typedItem.name ?? typedItem.config?.name;
    })
    .filter((name): name is string => typeof name === "string");
};

describe("sandbox agents schema", () => {
  test("exports the expected core columns", () => {
    expect(sandboxAgentsTable.id.name).toBe("id");
    expect(sandboxAgentsTable.adapterId.name).toBe("adapter_id");
    expect(sandboxAgentsTable.provider.name).toBe("provider");
    expect(sandboxAgentsTable.runtimeFamily.name).toBe("runtime_family");
    expect(sandboxAgentsTable.displayName.name).toBe("display_name");
    expect(sandboxAgentsTable.status.name).toBe("status");
    expect(sandboxAgentsTable.capabilitiesJson.name).toBe("capabilities_json");
    expect(sandboxAgentsTable.defaultLimitsJson.name).toBe("default_limits_json");
    expect(sandboxAgentsTable.sortOrder.name).toBe("sort_order");
    expect(sandboxAgentsTable.syncTime.name).toBe("sync_time");
  });

  test("exports lookup indexes for active agent listing", () => {
    const names = getExtraConfigNames();
    expect(names).toContain("sandbox_agents_status_sort_order_idx");
    expect(names).toContain("sandbox_agents_provider_runtime_idx");
    expect(names).toContain("sandbox_agents_adapter_id_unique");
  });
});
