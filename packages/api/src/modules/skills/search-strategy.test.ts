/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  DEFAULT_SKILL_KEYWORD_SEARCH_STRATEGY,
  getSkillKeywordSearchStrategyConfig,
  parseSkillKeywordSearchStrategy,
} from "./search-strategy";

describe("skill keyword search strategy config", () => {
  test("defaults missing and invalid values to the existing LIKE strategy", () => {
    expect(parseSkillKeywordSearchStrategy(undefined)).toBe(DEFAULT_SKILL_KEYWORD_SEARCH_STRATEGY);
    expect(parseSkillKeywordSearchStrategy(null)).toBe(DEFAULT_SKILL_KEYWORD_SEARCH_STRATEGY);
    expect(parseSkillKeywordSearchStrategy("")).toBe(DEFAULT_SKILL_KEYWORD_SEARCH_STRATEGY);
    expect(parseSkillKeywordSearchStrategy("legacy-static-index")).toBe(
      DEFAULT_SKILL_KEYWORD_SEARCH_STRATEGY,
    );
  });

  test("accepts rollout modes case-insensitively with surrounding whitespace", () => {
    expect(parseSkillKeywordSearchStrategy(" shadow ")).toBe("shadow");
    expect(parseSkillKeywordSearchStrategy("FTS5")).toBe("fts5");
  });

  test("maps modes to authoritative engine and shadow comparison flags", () => {
    expect(getSkillKeywordSearchStrategyConfig()).toEqual({
      authoritativeEngine: "like",
      shadowCompareFts5: false,
      strategy: "like",
    });
    expect(
      getSkillKeywordSearchStrategyConfig({
        SKILL_KEYWORD_SEARCH_STRATEGY: "shadow",
      }),
    ).toEqual({
      authoritativeEngine: "like",
      shadowCompareFts5: true,
      strategy: "shadow",
    });
    expect(
      getSkillKeywordSearchStrategyConfig({
        SKILL_KEYWORD_SEARCH_STRATEGY: "fts5",
      }),
    ).toEqual({
      authoritativeEngine: "fts5",
      shadowCompareFts5: false,
      strategy: "fts5",
    });
  });
});
