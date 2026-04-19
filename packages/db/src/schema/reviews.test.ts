/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { reviewsRelations, reviewsTable } from "./reviews";

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

describe("reviews schema", () => {
  test("exports the reviews table and relations", () => {
    expect(reviewsTable).toBeDefined();
    expect(reviewsRelations).toBeDefined();
  });

  test("exposes the expected core columns", () => {
    expect(reviewsTable.id.name).toBe("id");
    expect(reviewsTable.content.name).toBe("content");
    expect(reviewsTable.rating.name).toBe("rating");
    expect(reviewsTable.skillId.name).toBe("skill_id");
    expect(reviewsTable.userId.name).toBe("user_id");
    expect(reviewsTable.createdAt.name).toBe("created_at");
    expect(reviewsTable.updatedAt.name).toBe("updated_at");
  });

  test("retains the expected indexes and checks", () => {
    expect(getExtraConfigNames(reviewsTable)).toEqual([
      "reviews_rating_range",
      "reviews_skill_id_created_at_idx",
      "reviews_user_id_created_at_idx",
      "reviews_skill_id_user_id_unique",
    ]);
  });
});
