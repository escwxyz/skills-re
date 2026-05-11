/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import {
  fetchTagDetail,
  fetchTagTopSkills,
  fetchTagsListInitial,
  fetchTagsListPage,
} from "./tags.server";

type TagsListInitialClient = Parameters<typeof fetchTagsListInitial>[0]["client"];
type TagsListPageClient = Parameters<typeof fetchTagsListPage>[0]["client"];
type TagDetailClient = Parameters<typeof fetchTagDetail>[0]["client"];
type TagTopSkillsClient = Parameters<typeof fetchTagTopSkills>[0]["client"];

describe("fetchTagsListInitial", () => {
  test("forwards count and initial page calls to the public tags contract", async () => {
    const calls: { count: number; listPage?: { limit?: number } }[] = [];
    const client = {
      tags: {
        count: () => {
          calls.push({ count: 1 });
          return Promise.resolve(128);
        },
        listPage: (input?: { limit?: number }) => {
          calls.push({ count: 2, listPage: input ?? {} });
          return Promise.resolve({
            items: [
              {
                count: 10,
                id: "tag-1",
                slug: "automation",
              },
            ],
            nextCursor: "next-cursor",
            totalCount: 128,
          } as Awaited<ReturnType<TagsListInitialClient["tags"]["listPage"]>>);
        },
      },
    } satisfies TagsListInitialClient;

    expect(fetchTagsListInitial({ client })).resolves.toEqual({
      count: 128,
      initialPage: {
        items: [
          {
            count: 10,
            id: "tag-1",
            slug: "automation",
          },
        ],
        nextCursor: "next-cursor",
        totalCount: 128,
      },
    });

    expect(calls).toEqual([{ count: 1 }, { count: 2, listPage: { limit: 24 } }]);
  });
});

describe("fetchTagsListPage", () => {
  test("forwards cursor and limit to the public tag page contract", async () => {
    const calls: { cursor?: string; limit?: number }[] = [];
    const client = {
      tags: {
        listPage: (input?: { cursor?: string; limit?: number }) => {
          calls.push(input ?? {});
          return Promise.resolve({
            nextCursor: "next-cursor",
            totalCount: 42,
            items: [
              {
                count: 10,
                id: "tag-1",
                slug: "automation",
              },
            ],
          } as Awaited<ReturnType<TagsListPageClient["tags"]["listPage"]>>);
        },
      },
    } satisfies TagsListPageClient;

    expect(fetchTagsListPage({ client, cursor: "cursor-1", limit: 24 })).resolves.toEqual({
      nextCursor: "next-cursor",
      totalCount: 42,
      items: [
        {
          count: 10,
          id: "tag-1",
          slug: "automation",
        },
      ],
    });

    expect(calls).toEqual([
      {
        cursor: "cursor-1",
        limit: 24,
      },
    ]);
  });
});

describe("fetchTagDetail", () => {
  test("forwards the slug to the tag detail contract", async () => {
    const calls: string[] = [];
    const client = {
      tags: {
        getBySlug: ({ slug }: { slug: string }) => {
          calls.push(slug);
          return Promise.resolve({
            count: 9,
            id: "tag-1",
            indexable: true,
            relatedCategories: [{ count: 2, name: "Code Frameworks", slug: "code-frameworks" }],
            relatedTags: [{ count: 4, slug: "workflow" }],
            slug,
            topSkills: [
              {
                description: "Builds workflows",
                id: "skill-1",
                slug: "workflow-builder",
                syncTime: 1710000000,
                title: "Workflow Builder",
              },
            ],
          });
        },
      },
    } satisfies TagDetailClient;

    expect(fetchTagDetail({ client, slug: "testing" })).resolves.toEqual({
      count: 9,
      indexable: true,
      relatedCategories: [{ count: 2, name: "Code Frameworks", slug: "code-frameworks" }],
      relatedTags: [{ count: 4, slug: "workflow" }],
      slug: "testing",
    });

    expect(calls).toEqual(["testing"]);
  });
});

describe("fetchTagTopSkills", () => {
  test("forwards the slug to the tag top skills contract", async () => {
    const calls: string[] = [];
    const client = {
      tags: {
        getBySlug: ({ slug }: { slug: string }) => {
          calls.push(slug);
          return Promise.resolve({
            count: 11,
            id: "tag-2",
            indexable: true,
            relatedCategories: [{ count: 2, name: "Code Frameworks", slug: "code-frameworks" }],
            relatedTags: [{ count: 4, slug: "workflow" }],
            slug,
            topSkills: [
              {
                authorHandle: "alex",
                description: "Builds automation",
                id: "skill-1",
                repoName: "automation",
                slug: "automation-helper",
                syncTime: 1710000000,
                title: "Automation Helper",
              },
            ],
          });
        },
      },
    } satisfies TagTopSkillsClient;

    expect(fetchTagTopSkills({ client, slug: "automation" })).resolves.toEqual({
      count: 11,
      topSkills: [
        {
          authorHandle: "alex",
          description: "Builds automation",
          id: "skill-1",
          repoName: "automation",
          slug: "automation-helper",
          title: "Automation Helper",
        },
      ],
    });

    expect(calls).toEqual(["automation"]);
  });
});
