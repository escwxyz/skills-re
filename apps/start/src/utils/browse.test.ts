/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { shouldNoIndexSkillsBrowseSearch } from "@/utils/browse";

describe("skills browse SEO", () => {
  test("allows indexing the canonical browse page without search params", () => {
    expect(shouldNoIndexSkillsBrowseSearch({})).toBe(false);
  });

  test("noindexes browse pages with meaningful search params", () => {
    expect(shouldNoIndexSkillsBrowseSearch({ category: "operations-automation" })).toBe(true);
    expect(shouldNoIndexSkillsBrowseSearch({ sort: "newest" })).toBe(true);
    expect(shouldNoIndexSkillsBrowseSearch({ tag: ["frontend"] })).toBe(true);
    expect(shouldNoIndexSkillsBrowseSearch({ tags: ["api-integration"] })).toBe(true);
    expect(shouldNoIndexSkillsBrowseSearch({ q: "agent" })).toBe(true);
  });

  test("ignores empty search param values", () => {
    expect(shouldNoIndexSkillsBrowseSearch({ category: "", q: " ", tag: [], tags: [] })).toBe(
      false,
    );
  });
});
