/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asTagId } from "@skills-re/db/utils";
import { createTagsService } from "./service";

describe("tags service", () => {
  test("maps list rows directly", async () => {
    const calls: { all?: boolean; limit?: number }[] = [];
    const service = createTagsService({
      listTags: (input) => {
        calls.push(input ?? {});
        return [
          {
            count: 3,
            id: "tag-1",
            slug: "automation",
            status: "active",
          },
        ];
      },
    });

    await expect(service.list({ limit: 10 })).resolves.toEqual([
      {
        count: 3,
        id: "tag-1",
        slug: "automation",
        status: "active",
      },
    ]);
    expect(calls).toEqual([{ limit: 10 }]);
  });

  test("drops non-active tags from public reads", async () => {
    const service = createTagsService({
      findTagBySlug: () => ({
        count: 2,
        id: "tag-1",
        slug: "workflow",
        status: "pending",
      }),
      listTags: () => [
        {
          count: 2,
          id: "tag-1",
          slug: "workflow",
          status: "pending",
        },
        {
          count: 5,
          id: "tag-2",
          slug: "automation",
          status: "active",
        },
      ],
    });

    await expect(service.getBySlug({ slug: "workflow" })).resolves.toBeNull();
    await expect(service.list()).resolves.toEqual([
      {
        count: 5,
        id: "tag-2",
        slug: "automation",
        status: "active",
      },
    ]);
  });

  test("returns a tag detail payload with indexable and related data", async () => {
    const service = createTagsService({
      findTagBySlug: (slug) =>
        slug === "automation"
          ? {
              count: 5,
              id: "tag-1",
              slug,
              status: "active",
            }
          : null,
      getRelatedCategoriesByTagSlug: () => [
        {
          count: 2,
          name: "Tools & Platforms",
          slug: "tools-platforms",
        },
      ],
      getRelatedTagsByTagSlug: () => [
        {
          count: 1,
          slug: "workflow",
        },
      ],
      getTopSkillsByTagSlug: () => [
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

    await expect(service.getBySlug({ slug: "automation" })).resolves.toEqual({
      count: 5,
      id: "tag-1",
      indexable: true,
      relatedCategories: [
        {
          count: 2,
          name: "Tools & Platforms",
          slug: "tools-platforms",
        },
      ],
      relatedTags: [
        {
          count: 1,
          slug: "workflow",
        },
      ],
      slug: "automation",
      topSkills: [
        expect.objectContaining({
          description: "Widget skill",
          id: "skill-1",
          slug: "widget",
          title: "Widget",
        }),
      ],
    });
    await expect(service.getBySlug({ slug: "missing" })).resolves.toBeNull();
  });

  test("filters indexable tags by minCount", async () => {
    const service = createTagsService({
      listIndexableTags: () => [
        {
          count: 2,
          id: "tag-1",
          slug: "workflow",
          status: "active",
        },
        {
          count: 5,
          id: "tag-2",
          slug: "automation",
          status: "active",
        },
      ],
    });

    await expect(service.listIndexable({ minCount: 3 })).resolves.toEqual([
      {
        count: 5,
        id: "tag-2",
        slug: "automation",
        status: "active",
      },
    ]);
  });

  test("passes through seo tag slugs", async () => {
    const calls: { limit?: number }[] = [];
    const service = createTagsService({
      listTagsForSeo: (limit) => {
        calls.push({ limit });
        return [
          {
            count: 4,
            id: "tag-1",
            slug: "automation",
            status: "active",
          },
        ];
      },
    });

    await expect(service.listForSeo({ limit: 12 })).resolves.toEqual([
      {
        count: 4,
        id: "tag-1",
        slug: "automation",
        status: "active",
      },
    ]);
    expect(calls).toEqual([{ limit: 12 }]);
  });

  test("counts tags", async () => {
    const service = createTagsService({
      countTags: () => 11,
    });

    await expect(service.count()).resolves.toBe(11);
  });

  test("recomputes a tag count", async () => {
    const calls: {
      patchTagCount?: unknown;
    }[] = [];
    const service = createTagsService({
      computeSkillCountForTag: () => 7,
      patchTagCount: (input) => {
        calls.push({ patchTagCount: input });
      },
    });

    await expect(service.recomputeCount("tag-1")).resolves.toBe(7);
    expect(calls).toEqual([
      {
        patchTagCount: {
          count: 7,
          tagId: asTagId("tag-1"),
        },
      },
    ]);
  });

  test("recomputes impacted tag counts", async () => {
    const calls: string[] = [];
    const service = createTagsService({
      computeSkillCountForTag: (tagId) => {
        calls.push(tagId);
        return tagId === asTagId("tag-1") ? 5 : 8;
      },
      patchTagCount: () => {
        // Count writes are verified via the recompute calls above.
      },
    });

    await service.onSkillTagsChanged({
      nextTagIds: [asTagId("tag-2")],
      previousTagIds: [asTagId("tag-1")],
    });

    expect(calls).toEqual([asTagId("tag-1"), asTagId("tag-2")]);
  });

  test("filters low confidence ai tags before syncing", async () => {
    const calls: {
      syncSkillTags?: unknown;
    }[] = [];
    const service = createTagsService({
      syncSkillTags: (input) => {
        calls.push({ syncSkillTags: input });
        return input.tags;
      },
    });

    await expect(
      service.syncSkillTagsFromAi({
        existingTags: ["ai"],
        newTagMatchScoreThreshold: 0.9,
        newTags: [
          {
            matchScore: 0.95,
            slug: "automation",
          },
          {
            matchScore: 0.3,
            slug: "prototype",
          },
        ],
        skillId: "skill-1",
      }),
    ).resolves.toEqual(["ai", "automation"]);

    expect(calls).toEqual([
      {
        syncSkillTags: {
          createMissingStatus: "active",
          skillId: "skill-1",
          tags: ["ai", "automation"],
        },
      },
    ]);
  });

  test("runs the tagging pipeline and syncs generated tags", async () => {
    const calls: {
      readSnapshotFileContent?: unknown;
      syncSkillTags?: unknown;
    }[] = [];
    const service = createTagsService({
      generateSkillTagsBatch: (input) => {
        expect(input.existingTagCandidates).toEqual(["ai", "workflow"]);
        expect(input.items).toEqual([
          {
            content: "snapshot content",
            description: "Builds automation tools.",
            key: "skill-1",
            title: "Automation Builder",
          },
        ]);
        return {
          items: [
            {
              confidence: 0.91,
              key: "skill-1",
              newTagCandidates: [
                {
                  dimension: "techStack",
                  matchScore: 0.91,
                  slug: "ai-tools",
                },
                {
                  dimension: "domain",
                  matchScore: 0.92,
                  slug: "automation",
                },
              ],
              reason: "clear match",
              tags: ["ai", "ai-tools", "automation"],
            },
          ],
        };
      },
      listSkillTaggingTargetsByIds: () => [
        {
          description: "Builds automation tools.",
          id: "skill-1",
          latestSnapshotEntryPath: "README.md",
          latestSnapshotId: "snapshot-1",
          title: "Automation Builder",
        },
      ],
      listTags: () => [
        {
          count: 4,
          id: "tag-1",
          slug: "ai",
          status: "active",
        },
        {
          count: 2,
          id: "tag-2",
          slug: "workflow",
          status: "active",
        },
      ],
      readSnapshotFileContent: (input) => {
        calls.push({ readSnapshotFileContent: input });
        return {
          bytesRead: 15,
          content: "snapshot content",
          isTruncated: false,
          offset: 0,
          totalBytes: 15,
        };
      },
      syncSkillTags: (input) => {
        calls.push({ syncSkillTags: input });
        return ["ai-tools", "ai", "automation"];
      },
    });

    await expect(service.runSkillsTaggingPipeline({ skillIds: ["skill-1"] })).resolves.toEqual({
      failedCount: 0,
      updatedCount: 1,
    });
    expect(calls).toEqual([
      {
        readSnapshotFileContent: {
          maxBytes: 6000,
          path: "README.md",
          snapshotId: "snapshot-1",
        },
      },
      {
        syncSkillTags: {
          createMissingStatus: "active",
          skillId: "skill-1",
          tags: ["ai", "ai-tools", "automation"],
        },
      },
    ]);
  });
});
