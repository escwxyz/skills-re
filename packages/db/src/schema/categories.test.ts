/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { categoriesRelations, categoriesTable } from "./categories";

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

describe("categories schema", () => {
  test("exports the categories table and relations", () => {
    expect(categoriesTable).toBeDefined();
    expect(categoriesRelations).toBeDefined();
  });

  test("exposes the expected core columns", () => {
    expect(categoriesTable.id.name).toBe("id");
    expect(categoriesTable.count.name).toBe("count");
    expect(categoriesTable.description.name).toBe("description");
    expect(categoriesTable.keywords.name).toBe("keywords");
    expect(categoriesTable.name.name).toBe("name");
    expect(categoriesTable.slug.name).toBe("slug");
    expect(categoriesTable.status.name).toBe("status");
  });

  test("retains the legacy count check constraint", () => {
    expect(getExtraConfigNames(categoriesTable)).toContain("categories_count_non_negative");
  });
});
