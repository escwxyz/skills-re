/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { githubSubmitUrlSchema, parseGithubSubmitUrl } from "./github-submit";

describe("github-submit", () => {
  test("parses a repository root URL", () => {
    expect(githubSubmitUrlSchema.parse("https://github.com/openai/codex")).toEqual({
      githubUrl: "https://github.com/openai/codex",
      owner: "openai",
      repo: "codex",
    });
  });

  test("parses a tree URL into an optional skill root path", () => {
    expect(
      githubSubmitUrlSchema.parse("https://github.com/openai/codex/tree/main/skills/code-review"),
    ).toEqual({
      branch: "main",
      githubUrl: "https://github.com/openai/codex/tree/main/skills/code-review",
      owner: "openai",
      repo: "codex",
      skillRootPath: "skills/code-review",
    });
  });

  test("accepts repository URLs with a .git suffix", () => {
    expect(githubSubmitUrlSchema.parse("https://github.com/openai/codex.git")).toEqual({
      githubUrl: "https://github.com/openai/codex",
      owner: "openai",
      repo: "codex",
    });
  });

  test("normalizes uppercase scheme and host before parsing", () => {
    expect(parseGithubSubmitUrl("HTTPS://GITHUB.COM/OpenAI/Codex")).toEqual({
      githubUrl: "https://github.com/OpenAI/Codex",
      owner: "OpenAI",
      repo: "Codex",
    });
  });

  test("converts blob urls for SKILL.md into skill root paths", () => {
    expect(
      githubSubmitUrlSchema.parse(
        "https://github.com/openai/codex/blob/main/skills/code-review/SKILL.md",
      ),
    ).toEqual({
      branch: "main",
      githubUrl: "https://github.com/openai/codex/blob/main/skills/code-review/SKILL.md",
      owner: "openai",
      repo: "codex",
      skillRootPath: "skills/code-review",
    });
  });

  test("rejects non-repository GitHub URLs", () => {
    const parsed = githubSubmitUrlSchema.safeParse("https://github.com/openai");

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("valid GitHub repository URL");
  });
});
