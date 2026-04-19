/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { tagsRelations, tagsTable } from "./tags";

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

describe("tags schema", () => {
  test("exports the tags table and relations", () => {
    expect(tagsTable).toBeDefined();
    expect(tagsRelations).toBeDefined();
  });

  test("exposes the expected core columns", () => {
    expect(tagsTable.id.name).toBe("id");
    expect(tagsTable.count.name).toBe("count");
    expect(tagsTable.promotedAt.name).toBe("promoted_at");
    expect(tagsTable.slug.name).toBe("slug");
    expect(tagsTable.status.name).toBe("status");
  });

  test("retains the legacy count check constraint", () => {
    expect(getExtraConfigNames(tagsTable)).toContain("count_non_negative");
  });
});
