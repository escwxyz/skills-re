/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import {
  fetchCategories,
  fetchCategoriesStats,
  fetchCategoryDetailPageData,
  fetchCategoryTopSkills,
} from "./categories.server";

type CategoriesClient = Exclude<Parameters<typeof fetchCategories>[0]["client"], undefined>;
type CategoriesStatsClient = Parameters<typeof fetchCategoriesStats>[0]["client"];
type CategoryDetailClient = Parameters<typeof fetchCategoryDetailPageData>[0]["client"];
type CategoryTopSkillsClient = Parameters<typeof fetchCategoryTopSkills>[0]["client"];

describe("fetchCategories", () => {
  test("forwards the list and count calls to the public categories contract", async () => {
    const calls: { list?: { all?: boolean; limit?: number }; count?: number }[] = [];
    const client = {
      categories: {
        list: (input?: { all?: boolean; limit?: number }) => {
          calls.push({ list: input ?? {} });
          return Promise.resolve([
            {
              count: 3,
              id: "cat-1",
              name: "Automation",
              slug: "operations-automation",
            },
          ]);
        },
      },
      skills: {
        count: () => {
          calls.push({ count: 1 });
          return Promise.resolve(42);
        },
      },
    } satisfies CategoriesClient;

    await expect(fetchCategories({ client })).resolves.toEqual({
      categories: [
        {
          count: 3,
          id: "cat-1",
          name: "Automation",
          slug: "operations-automation",
        },
      ],
      skillsCount: 42,
    });

    expect(calls).toEqual([{ list: { all: true, limit: 100 } }, { count: 1 }]);
  });
});

describe("fetchCategoriesStats", () => {
  test("forwards countAuthors and daily metrics calls to the public metrics contract", async () => {
    const calls: string[] = [];
    const client = {
      metrics: {
        dailySkillsSnapshots: (input?: { limit?: number }) => {
          calls.push(`metrics:${input?.limit ?? "none"}`);
          return Promise.resolve([
            {
              day: "2024-01-01",
              newSkills: 2,
              newSnapshots: 1,
              updatedAtMs: 1710000000000,
            },
          ]);
        },
      },
      skills: {
        countAuthors: () => {
          calls.push("authors");
          return Promise.resolve({
            authorsCount: 11,
            verifiedCount: 3,
          });
        },
      },
    } satisfies CategoriesStatsClient;

    expect(fetchCategoriesStats({ client })).resolves.toEqual({
      authorsCount: 11,
      dailyMetrics: [
        {
          day: "2024-01-01",
          newSkills: 2,
          newSnapshots: 1,
          updatedAtMs: 1710000000000,
        },
      ],
    });

    expect(calls).toEqual(["authors", "metrics:7"]);
  });
});

describe("fetchCategoryDetailPageData", () => {
  test("forwards the slug to the public category detail contract", async () => {
    const categorySlug = "operations-automation" as const;
    const calls: string[] = [];
    const client = {
      categories: {
        getBySlug: ({ slug }: { slug: string }) => {
          calls.push(slug);
          return Promise.resolve({
            count: 9,
            id: "cat-1",
            name: "Automation",
            relatedTags: [{ count: 4, slug: "workflow" }],
            slug: categorySlug,
            topSkills: [
              {
                description: "Builds automation",
                id: "skill-1",
                slug: "automation-helper",
                syncTime: 1710000000,
                title: "Automation Helper",
              },
            ],
          });
        },
      },
    } satisfies CategoryDetailClient;

    expect(fetchCategoryDetailPageData({ client, slug: categorySlug })).resolves.toEqual({
      count: 9,
      relatedTags: [{ count: 4, slug: "workflow" }],
      slug: categorySlug,
    });

    expect(calls).toEqual([categorySlug]);
  });
});

describe("fetchCategoryTopSkills", () => {
  test("forwards the slug to the public category top skills contract", async () => {
    const categorySlug = "operations-automation" as const;
    const calls: string[] = [];
    const client = {
      categories: {
        getBySlug: ({ slug }: { slug: string }) => {
          calls.push(slug);
          return Promise.resolve({
            count: 12,
            id: "cat-2",
            name: "Automation",
            relatedTags: [{ count: 4, slug: "workflow" }],
            slug: categorySlug,
            topSkills: [
              {
                description: "Builds automation",
                id: "skill-1",
                slug: "automation-helper",
                syncTime: 1710000000,
                title: "Automation Helper",
              },
            ],
          });
        },
      },
    } satisfies CategoryTopSkillsClient;

    await expect(fetchCategoryTopSkills({ client, slug: categorySlug })).resolves.toEqual({
      count: 12,
      topSkills: [
        {
          authorHandle: undefined,
          description: "Builds automation",
          id: "skill-1",
          repoName: undefined,
          slug: "automation-helper",
          title: "Automation Helper",
        },
      ],
    });

    expect(calls).toEqual([categorySlug]);
  });
});
