/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { COLLECTIONS_PAGE_SIZE, fetchCollectionDetail, fetchCollectionsListPage } from "./collections.server";

type FetchCollectionsListPageClient = Parameters<typeof fetchCollectionsListPage>[0]["client"];
type FetchCollectionDetailClient = Parameters<typeof fetchCollectionDetail>[0]["client"];

describe("fetchCollectionsListPage", () => {
  test("forwards cursor and limit to the injected client", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      collections: {
        list: (input?: { cursor?: string; limit?: number }) => {
          calls.push({ list: input ?? {} });
          return Promise.resolve({
            continueCursor: "cursor-2",
            isDone: false,
            page: [
              {
                description: "Curated stack for automation",
                id: "collection-1",
                skillCount: 12,
                slug: "automation-stack",
                title: "Automation Stack",
              },
            ],
          });
        },
      },
    } satisfies FetchCollectionsListPageClient;

    await expect(
      fetchCollectionsListPage({
        client,
        cursor: "cursor-1",
        limit: 20,
      }),
    ).resolves.toEqual({
      continueCursor: "cursor-2",
      isDone: false,
      page: [
        {
          description: "Curated stack for automation",
          id: "collection-1",
          skillCount: 12,
          slug: "automation-stack",
          title: "Automation Stack",
        },
      ],
    });

    expect(calls).toEqual([
      {
        list: {
          cursor: "cursor-1",
          limit: 20,
        },
      },
    ]);
  });

  test("defaults the limit when one is not provided", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      collections: {
        list: (input?: { cursor?: string; limit?: number }) => {
          calls.push({ list: input ?? {} });
          return Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: [],
          });
        },
      },
    } satisfies FetchCollectionsListPageClient;

    await expect(
      fetchCollectionsListPage({
        client,
      }),
    ).resolves.toEqual({
      continueCursor: "",
      isDone: true,
      page: [],
    });

    expect(calls).toEqual([
      {
        list: {
          cursor: undefined,
          limit: COLLECTIONS_PAGE_SIZE,
        },
      },
    ]);
  });
});

describe("fetchCollectionDetail", () => {
  test("returns the raw collection payload from the injected client", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      collections: {
        getBySlug: (input?: { slug: string }) => {
          calls.push({ getBySlug: input ?? {} });
          return Promise.resolve({
            description: "A curated stack of automation skills",
            id: "collection-1",
            slug: "automation-stack",
            skills: [
              {
                description: "Builds workflows",
                id: "skill-1",
                slug: "workflow-builder",
                title: "Workflow Builder",
              },
            ],
            title: "Automation Stack",
          });
        },
      },
    } satisfies FetchCollectionDetailClient;

    await expect(
      fetchCollectionDetail({
        client,
        slug: "automation-stack",
      }),
    ).resolves.toEqual({
      description: "A curated stack of automation skills",
      id: "collection-1",
      slug: "automation-stack",
      skills: [
        {
          description: "Builds workflows",
          id: "skill-1",
          slug: "workflow-builder",
          title: "Workflow Builder",
        },
      ],
      title: "Automation Stack",
    });

    expect(calls).toEqual([
      {
        getBySlug: {
          slug: "automation-stack",
        },
      },
    ]);
  });
});
