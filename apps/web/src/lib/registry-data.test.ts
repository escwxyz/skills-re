/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  DEFAULT_BROWSE_SORT,
  formatCompactNumber,
  getBrowseSortLabel,
  sumDailyMetrics,
  toBrowseCategoryItem,
  toBrowseSkillItem,
  toCategoryCardItem,
  toFeaturedPickItem,
  toSkillCardItem,
} from "./registry-data";

describe("registry-data", () => {
  test("sums daily metrics across the selected window", () => {
    expect(
      sumDailyMetrics([
        {
          day: "2026-04-20",
          newSkills: 3,
          newSnapshots: 7,
          updatedAtMs: 1,
        },
        {
          day: "2026-04-21",
          newSkills: 2,
          newSnapshots: 5,
          updatedAtMs: 2,
        },
      ]),
    ).toEqual({
      newSkills: 5,
      newSnapshots: 12,
    });
  });

  test("maps category records onto the presentation shell", () => {
    expect(
      toCategoryCardItem(
        {
          count: 42,
          id: "cat_code_frameworks",
          name: "Code Frameworks",
          slug: "code-frameworks",
        },
        0,
      ),
    ).toEqual({
      description:
        "Reusable libraries, SDKs, boilerplates, and scaffolds for building software faster.",
      id: "code-frameworks",
      num: "01",
      skillCount: 42,
      title: "Code Frameworks",
      variant: "default",
    });
  });

  test("maps searchable skills onto card data", () => {
    const mapped = toSkillCardItem({
      author: {
        githubUrl: "https://github.com/core-systems",
        handle: "core-systems",
      },
      authorHandle: "core-systems",
      description: "Reads a diff carefully.",
      downloadsAllTime: 12_450,
      downloadsTrending: 320,
      id: "skill_123",
      latestVersion: "2.4.1",
      primaryCategory: "code-frameworks",
      slug: "code-review",
      stargazerCount: 5231,
      staticAudit: {
        isBlocked: false,
        overallScore: 97,
        riskLevel: "low",
        safeToPublish: true,
        status: "pass",
        summary: "Healthy",
        syncTime: 123,
      },
      title: "code-review",
    });

    expect(mapped).toEqual({
      auditScore: 97,
      authorLabel: "core-systems",
      badgeLabel: "v2.4.1",
      categoryLabel: "Code Frameworks",
      description: "Reads a diff carefully.",
      id: "skill_123",
      slug: "code-review",
      starsLabel: formatCompactNumber(5231),
      tags: [],
      title: "code-review",
    });
  });

  test("maps browse categories with formatted counts", () => {
    expect(
      toBrowseCategoryItem(
        {
          count: 1420,
          id: "cat_code",
          name: "Code Frameworks",
          slug: "code-frameworks",
        },
        0,
      ),
    ).toEqual({
      count: 1420,
      countLabel: "1,420",
      id: "code-frameworks",
      num: "01",
      title: "Code Frameworks",
    });
  });

  test("maps browse skills with downloads and version labels", () => {
    expect(
      toBrowseSkillItem({
        authorHandle: "hallie",
        description: "Anchored PR review.",
        downloadsAllTime: 412_000,
        downloadsTrending: 1200,
        id: "skill_456",
        latestVersion: "2.4.1",
        primaryCategory: "code-frameworks",
        slug: "code-review",
        title: "code-review",
      }),
    ).toEqual({
      auditScore: undefined,
      authorLabel: "hallie",
      badgeLabel: "v2.4.1",
      categoryLabel: "Code Frameworks",
      description: "Anchored PR review.",
      downloadsLabel: formatCompactNumber(412_000),
      id: "skill_456",
      latestVersionLabel: "v2.4.1",
      slug: "code-review",
      starsLabel: undefined,
      tags: [],
      title: "code-review",
    });
  });

  test("maps featured picks from search results", () => {
    expect(
      toFeaturedPickItem({
        authorHandle: "hallie",
        description: "Anchored PR review.",
        downloadsAllTime: 412_000,
        downloadsTrending: 1200,
        id: "skill_456",
        latestVersion: "2.4.1",
        slug: "code-review",
        title: "code-review",
      }),
    ).toEqual({
      description: "Anchored PR review.",
      id: "skill_456",
      installsLabel: formatCompactNumber(412_000),
      slug: "code-review",
      title: "code-review",
      versionLabel: "v2.4.1",
    });
  });

  test("returns stable browse sort labels", () => {
    expect(getBrowseSortLabel(DEFAULT_BROWSE_SORT)).toBe("Installs");
    expect(getBrowseSortLabel("updated")).toBe("Updated");
  });
});
