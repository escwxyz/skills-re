/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  buildSkillFtsMatchQuery,
  SKILL_FTS_MAX_QUERY_CHARS,
  SKILL_FTS_MAX_QUERY_TOKENS,
} from "./fts-query";

describe("buildSkillFtsMatchQuery", () => {
  test("emits quoted prefix terms for ASCII multi-token input", () => {
    expect(buildSkillFtsMatchQuery(" workflow builder  ")).toEqual({
      expression: '"workflow"* "builder"*',
      isTruncated: false,
      tokens: ["workflow", "builder"],
    });
  });

  test("drops FTS5 syntax characters instead of preserving executable operators", () => {
    expect(buildSkillFtsMatchQuery('"workflow" OR repo:skills -draft*')).toMatchObject({
      expression: '"workflow"* "OR"* "repo"* "skills"* "draft"*',
      tokens: ["workflow", "OR", "repo", "skills", "draft"],
    });
  });

  test("handles punctuation-heavy identifiers", () => {
    expect(buildSkillFtsMatchQuery("github/action-workflow_v2.1")).toMatchObject({
      expression: '"github"* "action"* "workflow"* "v2"* "1"*',
      tokens: ["github", "action", "workflow", "v2", "1"],
    });
  });

  test("preserves accented and CJK tokens", () => {
    expect(buildSkillFtsMatchQuery("café résumé 数据 搜索")).toMatchObject({
      expression: '"café"* "résumé"* "数据"* "搜索"*',
      tokens: ["café", "résumé", "数据", "搜索"],
    });
  });

  test("normalizes full-width text before tokenizing", () => {
    expect(buildSkillFtsMatchQuery("ｇｉｔｈｕｂ　検索")).toMatchObject({
      expression: '"github"* "検索"*',
      tokens: ["github", "検索"],
    });
  });

  test("returns null for empty, whitespace-only, and emoji-only input", () => {
    expect(buildSkillFtsMatchQuery("")).toBeNull();
    expect(buildSkillFtsMatchQuery("   ")).toBeNull();
    expect(buildSkillFtsMatchQuery("✨🔥")).toBeNull();
  });

  test("caps excessive query length and token count", () => {
    const terms = Array.from(
      { length: SKILL_FTS_MAX_QUERY_TOKENS + 4 },
      (_, index) => `term${index}`,
    );
    const result = buildSkillFtsMatchQuery(
      `${terms.join(" ")} ${"x".repeat(SKILL_FTS_MAX_QUERY_CHARS)}`,
    );

    expect(result?.tokens).toHaveLength(SKILL_FTS_MAX_QUERY_TOKENS);
    expect(result?.tokens).toEqual(terms.slice(0, SKILL_FTS_MAX_QUERY_TOKENS));
    expect(result?.isTruncated).toBe(true);
  });
});
