/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { categoryDetailSchema, categoryListItemSchema } from "./common/content";
import { categoriesContract } from "./categories";

describe("categories contract", () => {
  test("accepts a category list item payload", () => {
    expect(
      categoryListItemSchema.parse({
        count: 3,
        description: "Tools and platforms",
        id: "category-1",
        name: "Tools & Platforms",
        slug: "tools-platforms",
      }),
    ).toEqual({
      count: 3,
      description: "Tools and platforms",
      id: "category-1",
      name: "Tools & Platforms",
      slug: "tools-platforms",
    });
  });

  test("accepts a category detail payload", () => {
    expect(
      categoryDetailSchema.parse({
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
          {
            description: "Widget skill",
            id: "skill-1",
            slug: "widget",
            syncTime: 123,
            title: "Widget",
          },
        ],
      }),
    ).toEqual({
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
        {
          description: "Widget skill",
          id: "skill-1",
          slug: "widget",
          syncTime: 123,
          title: "Widget",
        },
      ],
    });
  });

  test("exposes the public category routes used by the API layer", () => {
    expect(categoriesContract.list).toBeDefined();
    expect(categoriesContract.count).toBeDefined();
    expect(categoriesContract.getBySlug).toBeDefined();
    expect(categoriesContract.listForAi).toBeDefined();
  });
});
