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
          description: "Voice-consistent drafting and editing.",
          id: "cat_writing",
          name: "Writing & Editing",
          slug: "writing",
        },
        0,
      ),
    ).toEqual({
      description: "Voice-consistent drafting and editing.",
      id: "writing",
      num: "04",
      skillCount: 42,
      title: "Writing & Editing",
      variant: "blue",
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
      primaryCategory: "Code & Craft",
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
      categoryLabel: "Code & Craft",
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
          description: "Diffs, code, refactors.",
          id: "cat_code",
          name: "Code & Craft",
          slug: "code-craft",
        },
        0,
      ),
    ).toEqual({
      count: 1420,
      countLabel: "1,420",
      id: "code-craft",
      num: "01",
      title: "Code & Craft",
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
        primaryCategory: "Code & Craft",
        slug: "code-review",
        title: "code-review",
      }),
    ).toEqual({
      auditScore: undefined,
      authorLabel: "hallie",
      badgeLabel: "v2.4.1",
      categoryLabel: "Code & Craft",
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

  test("getBrowseSortLabel returns correct labels for all known sort values", () => {
    expect(getBrowseSortLabel("downloads-trending")).toBe("Trending");
    expect(getBrowseSortLabel("newest")).toBe("Newest");
    expect(getBrowseSortLabel("stars")).toBe("Stars");
    expect(getBrowseSortLabel("updated")).toBe("Updated");
    expect(getBrowseSortLabel("views")).toBe("Views");
  });

  test("getBrowseSortLabel defaults to 'Installs' for unknown sort values", () => {
    // The 'downloads-all-time' case was removed in this PR; it now falls to default
    expect(getBrowseSortLabel("downloads-all-time" as never)).toBe("Installs");
    expect(getBrowseSortLabel("unknown-sort" as never)).toBe("Installs");
  });

  test("sumDailyMetrics returns zeros for an empty array", () => {
    expect(sumDailyMetrics([])).toEqual({
      newSkills: 0,
      newSnapshots: 0,
    });
  });

  test("sumDailyMetrics handles a single point", () => {
    expect(
      sumDailyMetrics([
        {
          day: "2026-04-20",
          newSkills: 10,
          newSnapshots: 20,
          updatedAtMs: 1,
        },
      ]),
    ).toEqual({
      newSkills: 10,
      newSnapshots: 20,
    });
  });

  test("toSkillCardItem returns undefined starsLabel when stargazerCount is undefined", () => {
    const mapped = toSkillCardItem({
      authorHandle: "hallie",
      description: "No stars yet.",
      downloadsAllTime: 0,
      downloadsTrending: 0,
      id: "skill_no_stars",
      latestVersion: "1.0.0",
      slug: "no-stars",
      stargazerCount: undefined,
      title: "no-stars",
    });

    expect(mapped.starsLabel).toBeUndefined();
  });

  test("toSkillCardItem formats starsLabel when stargazerCount is zero", () => {
    const mapped = toSkillCardItem({
      authorHandle: "hallie",
      description: "Zero stars.",
      downloadsAllTime: 0,
      downloadsTrending: 0,
      id: "skill_zero_stars",
      latestVersion: "1.0.0",
      slug: "zero-stars",
      stargazerCount: 0,
      title: "zero-stars",
    });

    // 0 is not undefined so it should be formatted
    expect(mapped.starsLabel).toBe(formatCompactNumber(0));
  });
});
