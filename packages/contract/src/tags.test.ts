/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { tagDetailSchema, tagListItemSchema } from "./common/content";
import { tagsContract } from "./tags";

describe("tags contract", () => {
  test("accepts a tag list item payload", () => {
    expect(
      tagListItemSchema.parse({
        count: 3,
        id: "tag-1",
        slug: "automation",
      }),
    ).toEqual({
      count: 3,
      id: "tag-1",
      slug: "automation",
    });
  });

  test("accepts a tag detail payload", () => {
    expect(
      tagDetailSchema.parse({
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
      }),
    ).toEqual({
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
  });

  test("exposes the public tag routes used by the API layer", () => {
    expect(tagsContract.list).toBeDefined();
    expect(tagsContract.count).toBeDefined();
    expect(tagsContract.getBySlug).toBeDefined();
    expect(tagsContract.listForSeo).toBeDefined();
    expect(tagsContract.listIndexable).toBeDefined();
  });
});
