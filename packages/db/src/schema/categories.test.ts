/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { categoryCountsTable } from "./categories";

const getExtraConfigNames = (table: object) => {
  const builderKey = Object.getOwnPropertySymbols(table).find((symbol) =>
    String(symbol).includes("ExtraConfigBuilder"),
  );
  if (!builderKey) {
    return [];
  }

  return ((table as Record<symbol, unknown>)[builderKey] as (table: object) => unknown[])(table)
    .map((item) => {
      const typedItem = item as { config?: { name?: string }; name?: string };
      return typedItem.name ?? typedItem.config?.name;
    })
    .filter((name): name is string => typeof name === "string");
};

describe("category counts schema", () => {
  test("exports the category counts table", () => {
    expect(categoryCountsTable).toBeDefined();
  });

  test("exposes the expected core columns", () => {
    expect(categoryCountsTable.count.name).toBe("count");
    expect(categoryCountsTable.slug.name).toBe("slug");
    expect(categoryCountsTable.updatedAt.name).toBe("updated_at");
  });

  test("retains the non-negative count check constraint", () => {
    expect(getExtraConfigNames(categoryCountsTable)).toContain(
      "category_counts_count_non_negative",
    );
  });
});
