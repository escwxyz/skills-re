/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { compareCategoriesForDisplay } from "./repo";

describe("categories repo", () => {
  test("keeps other category last regardless of count", () => {
    const sorted = [
      { count: 10, slug: "other" },
      { count: 20, slug: "tools-platforms" },
      { count: 10, slug: "analysis-insights" },
    ].toSorted(compareCategoriesForDisplay);

    expect(sorted.map((item) => item.slug)).toEqual([
      "tools-platforms",
      "analysis-insights",
      "other",
    ]);
  });
});
