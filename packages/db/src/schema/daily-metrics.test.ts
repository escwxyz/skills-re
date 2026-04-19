/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { dailyMetricsTable } from "./daily-metrics";

describe("daily metrics schema", () => {
  test("exports the expected core columns", () => {
    expect(dailyMetricsTable.day.name).toBe("day");
    expect(dailyMetricsTable.newSkills.name).toBe("new_skills");
    expect(dailyMetricsTable.newSnapshots.name).toBe("new_snapshots");
    expect(dailyMetricsTable.updatedAtMs.name).toBe("updated_at_ms");
  });

  test("retains the legacy non-negative checks", () => {
    const builderKey = Object.getOwnPropertySymbols(dailyMetricsTable).find((symbol) =>
      String(symbol).includes("ExtraConfigBuilder"),
    );
    expect(builderKey).toBeDefined();
    const builders = ((dailyMetricsTable as Record<symbol, unknown>)[builderKey as symbol] as (
      table: object,
    ) => unknown[])(dailyMetricsTable);
    const names = builders
      .map((item) => {
        const typedItem = item as { name?: string; config?: { name?: string } };
        return typedItem.name ?? typedItem.config?.name;
      })
      .filter((name): name is string => typeof name === "string");

    expect(names).toContain("daily_metrics_new_skills_non_negative");
    expect(names).toContain("daily_metrics_new_snapshots_non_negative");
    expect(names).toContain("daily_metrics_updated_at_ms_non_negative");
  });
});
