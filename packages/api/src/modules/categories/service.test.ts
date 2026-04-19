/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asCategoryId } from "@skills-re/db/utils";
import { createCategoriesService } from "./service";

describe("categories service", () => {
  test("maps category list rows directly", async () => {
    const calls: { all?: boolean; limit?: number }[] = [];
    const service = createCategoriesService({
      listCategories: async (input) => {
        calls.push(input ?? {});
        return [
          {
            count: 3,
            description: "Tools and platforms",
            id: "category-1",
            name: "Tools & Platforms",
            slug: "tools-platforms",
            status: "active",
          },
        ];
      },
    });

    await expect(service.listCategories({ limit: 10 })).resolves.toEqual([
      {
        count: 3,
        description: "Tools and platforms",
        id: "category-1",
        name: "Tools & Platforms",
        slug: "tools-platforms",
        status: "active",
      },
    ]);
    expect(calls).toEqual([{ limit: 10 }]);
  });

  test("drops deprecated categories from public reads", async () => {
    const service = createCategoriesService({
      findCategoryBySlug: async () => ({
        count: 3,
        description: "Old",
        id: "category-1",
        name: "Old",
        slug: "old",
        status: "deprecated",
      }),
      listCategories: async () => [
        {
          count: 3,
          description: "Old",
          id: "category-1",
          name: "Old",
          slug: "old",
          status: "deprecated",
        },
        {
          count: 5,
          description: "Tools and platforms",
          id: "category-2",
          name: "Tools & Platforms",
          slug: "tools-platforms",
          status: "active",
        },
      ],
    });

    await expect(service.getCategoryBySlug({ slug: "old" })).resolves.toBeNull();
    await expect(service.listCategories()).resolves.toEqual([
      {
        count: 5,
        description: "Tools and platforms",
        id: "category-2",
        name: "Tools & Platforms",
        slug: "tools-platforms",
        status: "active",
      },
    ]);
  });

  test("maps category detail payload with related tags and top skills", async () => {
    const service = createCategoriesService({
      findCategoryBySlug: async (slug) =>
        slug === "tools-platforms"
          ? {
              count: 5,
              description: "Tools and platforms",
              id: "category-1",
              name: "Tools & Platforms",
              slug,
              status: "active",
            }
          : null,
      getRelatedTagsByCategorySlug: async (slug) => [
        {
          count: slug === "tools-platforms" ? 2 : 0,
          slug: "automation",
        },
      ],
      getTopSkillsByCategorySlug: async () => [
        {
          authorHandle: "acme",
          createdAt: 100,
          description: "Widget skill",
          downloadsAllTime: 7,
          downloadsTrending: 1,
          forkCount: 0,
          id: "skill-1",
          isVerified: true,
          latestVersion: "1.0.0",
          license: "MIT",
          primaryCategory: "tools-platforms",
          repoName: "widget",
          repoUrl: "https://github.com/acme/widget",
          slug: "widget",
          stargazerCount: 12,
          syncTime: 123,
          title: "Widget",
          updatedAt: 124,
          viewsAllTime: 55,
        },
      ],
    });

    await expect(service.getCategoryBySlug({ slug: "tools-platforms" })).resolves.toEqual({
      count: 5,
      description: "Tools and platforms",
      id: "category-1",
      name: "Tools & Platforms",
      relatedTags: [
        {
          count: 2,
          slug: "automation",
        },
      ],
      slug: "tools-platforms",
      topSkills: [
        expect.objectContaining({
          description: "Widget skill",
          id: "skill-1",
          slug: "widget",
          title: "Widget",
        }),
      ],
    });
    await expect(service.getCategoryBySlug({ slug: "missing" })).resolves.toBeNull();
  });

  test("passes through ai category slugs", async () => {
    const calls: { limit?: number }[] = [];
    const service = createCategoriesService({
      listCategoriesForAi: async (input) => {
        calls.push(input ?? {});
        return ["analysis-insights", "tools-platforms"];
      },
    });

    await expect(service.listCategoriesForAi({ limit: 2 })).resolves.toEqual([
      "analysis-insights",
      "tools-platforms",
    ]);
    expect(calls).toEqual([{ limit: 2 }]);
  });

  test("counts categories", async () => {
    const service = createCategoriesService({
      countCategories: async () => 9,
    });

    await expect(service.countCategories()).resolves.toBe(9);
  });

  test("recomputes a category count", async () => {
    const calls: {
      patchCategoryCount?: unknown;
    }[] = [];
    const service = createCategoriesService({
      computeSkillCountForCategory: async () => 4,
      patchCategoryCount: async (input) => {
        calls.push({ patchCategoryCount: input });
      },
    });

    await expect(service.recomputeCount("category-1")).resolves.toBe(4);
    expect(calls).toEqual([
      {
        patchCategoryCount: {
          categoryId: "category-1",
          count: 4,
        },
      },
    ]);
  });

  test("recomputes impacted category counts", async () => {
    const calls: string[] = [];
    const service = createCategoriesService({
      computeSkillCountForCategory: async (categoryId) => {
        calls.push(categoryId);
        return categoryId === "category-1" ? 3 : 6;
      },
      patchCategoryCount: async () => {
        // The ids are asserted via the recompute calls.
      },
    });

    await service.onSkillCategoryChanged({
      nextCategoryId: asCategoryId("category-2"),
      previousCategoryId: asCategoryId("category-1"),
    });

    expect(calls).toEqual([asCategoryId("category-1"), asCategoryId("category-2")]);
  });

  test("runs the categorization pipeline and updates the selected category", async () => {
    const calls: {
      updateSkillCategory?: unknown;
    }[] = [];
    const service = createCategoriesService({
      findCategoryBySlug: async (slug) =>
        slug === "code-frameworks"
          ? {
              count: 5,
              description: "Code frameworks",
              id: asCategoryId("category-1"),
              name: "Code Frameworks",
              slug,
              status: "active",
            }
          : null,
      generateSkillCategoriesBatch: async (input) => {
        expect(input.categories.map((category) => category.slug)).toEqual(["code-frameworks"]);
        expect(input.items).toEqual([
          {
            description: "A code framework for apps.",
            key: "skill-1",
            tags: ["framework"],
            title: "Framework Skill",
          },
        ]);
        return {
          items: [
            {
              confidence: 0.87,
              key: "skill-1",
              primaryCategory: "code-frameworks",
              reasoning: "clear primary deliverable",
              scores: {
                "analysis-insights": 1,
                "code-frameworks": 10,
                "communication-strategy": 0,
                "design-creative": 0,
                "domain-expertise": 2,
                "operations-automation": 0,
                other: 0,
                "process-methodology": 1,
                "tools-platforms": 2,
              },
            },
          ],
        };
      },
      computeSkillCountForCategory: async () => 5,
      listDefinitionsForAi: async () => [
        {
          description: "Code frameworks",
          keywords: ["framework", "sdk"],
          name: "Code Frameworks",
          slug: "code-frameworks",
        },
      ],
      listSkillCategorizationTargetsByIds: async () => [
        {
          categoryId: null,
          description: "A code framework for apps.",
          id: "skill-1",
          tags: ["framework"],
          title: "Framework Skill",
        },
      ],
      patchCategoryCount: async () => {
        // Count writes are verified by the update path.
      },
      updateSkillCategory: async (input) => {
        calls.push({ updateSkillCategory: input });
      },
    });

    await expect(
      service.runSkillsCategorizationPipeline({ skillIds: ["skill-1"] }),
    ).resolves.toEqual({
      failedCount: 0,
      updatedCount: 1,
    });
    expect(calls).toEqual([
      {
        updateSkillCategory: {
          categoryId: asCategoryId("category-1"),
          skillId: "skill-1",
        },
      },
    ]);
  });
});
