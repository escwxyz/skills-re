/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { toAuthorIndexCard, toAuthorSkillRowData } from "./author-data";

describe("author-data", () => {
  test("maps author directory entries onto live index cards", () => {
    expect(
      toAuthorIndexCard({
        githubUrl: "https://github.com/hallie",
        handle: "hallie",
        isVerified: true,
        name: "Hallie Lien",
        repoCount: 7,
        skillCount: 18,
      }),
    ).toEqual({
      avatarLabel: "H",
      githubUrl: "https://github.com/hallie",
      handle: "hallie",
      isVerified: true,
      name: "Hallie Lien",
      repoCountLabel: "7",
      skillCount: 18,
      skillCountLabel: "18",
    });
  });

  test("maps author skill rows with current public metrics only", () => {
    expect(
      toAuthorSkillRowData(
        {
          description: "Diff-first review.",
          downloadsAllTime: 412_000,
          id: "skill_123",
          latestVersion: "2.4.1",
          license: "MIT",
          slug: "code-review",
          stargazerCount: 5200,
          staticAudit: {
            overallScore: 97,
          },
          title: "code-review",
        },
        2,
      ),
    ).toEqual({
      auditScoreLabel: "97/100",
      description: "Diff-first review.",
      downloadsLabel: "412K",
      id: "skill_123",
      index: 2,
      latestVersionLabel: "v2.4.1",
      licenseLabel: "MIT",
      slug: "code-review",
      starsLabel: "5.2K",
      title: "code-review",
    });
  });
});
