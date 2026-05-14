/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { PreviewDiagnosticMessages, RepoPreview } from "./github-submit-diagnostics";
import { buildPreviewDiagnostics } from "./github-submit-diagnostics";

const messages: PreviewDiagnosticMessages = {
  logs_found_invalid_skill_like_folders: () => "Found invalid skill-like folders.",
  logs_no_publishable_skills: () => "No publishable skills.",
  logs_no_publishable_skills_under: ({ path }) => `No publishable skills under ${path}.`,
  logs_no_recognized_skill_roots: () => "No recognized skill roots.",
};

describe("buildPreviewDiagnostics", () => {
  test("returns invalid skill diagnostics when the preview has invalid folders", () => {
    const preview: RepoPreview = {
      branch: "main",
      invalidSkills: [
        {
          message: "Missing skill.md.",
          skillMdPath: "skills/example/skill.md",
          skillRootPath: "skills/example",
        },
      ],
      owner: "acme",
      repo: "skills",
      requestedSkillPath: "skills",
      skills: [],
    };

    expect(buildPreviewDiagnostics(preview, messages)).toEqual([
      "No publishable skills under skills.",
      "Found invalid skill-like folders.",
      "- skills/example/skill.md: Missing skill.md",
    ]);
  });

  test("returns recognized-root diagnostics when nothing is publishable", () => {
    const preview: RepoPreview = {
      branch: "main",
      invalidSkills: [],
      owner: "acme",
      repo: "skills",
      requestedSkillPath: null,
      skills: [],
    };

    expect(buildPreviewDiagnostics(preview, messages)).toEqual([
      "No publishable skills.",
      "No recognized skill roots.",
    ]);
  });

  test("returns no diagnostics when publishable skills exist", () => {
    const preview: RepoPreview = {
      branch: "main",
      invalidSkills: [],
      owner: "acme",
      repo: "skills",
      requestedSkillPath: null,
      skills: [
        {
          skillDescription: "Example",
          skillMdPath: "skills/example/skill.md",
          skillRootPath: "skills/example",
          skillTitle: "Example",
        },
      ],
    };

    expect(buildPreviewDiagnostics(preview, messages)).toEqual([]);
  });
});
