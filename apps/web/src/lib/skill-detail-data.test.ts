/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  buildFileTreeRows,
  parseSkillMarkdownDocument,
  splitLegacyReviewContent,
} from "./skill-detail-data";

describe("skill-detail-data", () => {
  test("parses frontmatter and strips the top-level title from skill markdown", () => {
    const document = parseSkillMarkdownDocument(`---
name: code-review
description: A careful reviewer
license: MIT
allowed-tools:
  - bash
  - git
metadata:
  owner: platform
  runtime: claude
---
# code-review

## Inputs

Provide a diff.

## Behavior

Return at most three findings.
`);

    expect(document.frontmatter).toEqual({
      allowedTools: "bash, git",
      compatibility: undefined,
      description: "A careful reviewer",
      license: "MIT",
      metadata: {
        owner: "platform",
        runtime: "claude",
      },
      name: "code-review",
    });
    expect(document.body).not.toContain("# code-review");
    expect(document.tocItems).toEqual(["Inputs", "Behavior"]);
  });

  test("builds a stable tree row order for snapshot file navigation", () => {
    expect(
      buildFileTreeRows(
        [
          { path: "README.md", size: 1024 },
          { path: "prompts/system.md", size: 512 },
          { path: "prompts/triage.md", size: 256 },
          { path: "examples/ci.yml", size: 128 },
        ],
        "prompts/system.md",
      ),
    ).toEqual([
      {
        depth: 0,
        isActive: false,
        name: "examples",
        path: "examples",
        type: "folder",
      },
      {
        depth: 1,
        isActive: false,
        name: "ci.yml",
        path: "examples/ci.yml",
        size: 128,
        type: "file",
      },
      {
        depth: 0,
        isActive: false,
        name: "prompts",
        path: "prompts",
        type: "folder",
      },
      {
        depth: 1,
        isActive: true,
        name: "system.md",
        path: "prompts/system.md",
        size: 512,
        type: "file",
      },
      {
        depth: 1,
        isActive: false,
        name: "triage.md",
        path: "prompts/triage.md",
        size: 256,
        type: "file",
      },
      {
        depth: 0,
        isActive: false,
        name: "README.md",
        path: "README.md",
        size: 1024,
        type: "file",
      },
    ]);
  });

  test("splits legacy embedded review titles from markdown content", () => {
    expect(splitLegacyReviewContent("**Strong fit**\n\nHelpful details")).toEqual({
      body: "Helpful details",
      title: "Strong fit",
    });

    expect(splitLegacyReviewContent("Helpful details", "Structured title")).toEqual({
      body: "Helpful details",
      title: "Structured title",
    });
  });
});
