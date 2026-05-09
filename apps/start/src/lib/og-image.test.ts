/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { buildAuthorOgImagePath, buildSkillOgImagePath } from "./og-image";

describe("og-image paths", () => {
  test("builds the author og route path", () => {
    expect(buildAuthorOgImagePath("OpenAI")).toBe("/api/og/authors/OpenAI/png");
  });

  test("builds the skill og route path and encodes segments", () => {
    expect(
      buildSkillOgImagePath({
        authorHandle: "open ai",
        repoName: "skills/core",
        skillSlug: "code review",
      }),
    ).toBe("/api/og/skills/open%20ai/skills%2Fcore/code%20review/png");
  });

  test("returns null when the repository name is missing", () => {
    expect(
      buildSkillOgImagePath({
        authorHandle: "openai",
        repoName: null,
        skillSlug: "code-review",
      }),
    ).toBeNull();
  });
});
