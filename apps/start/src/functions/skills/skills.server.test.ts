/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  fetchSkillCheckSaved,
  fetchSkillVersionHistory,
  fetchSkillsBrowseInitialPage,
  fetchSkillsBrowseMeta,
  fetchSkillsBrowsePagination,
  normalizeSkillsBrowseFilters,
  saveSkillToDashboard,
  resolveSkillBase,
  resolveSnapshot,
  unsaveSkillFromDashboard,
} from "./skills.server";

type ResolveSkillBaseClient = Parameters<typeof resolveSkillBase>[0]["client"];
type FetchSkillVersionHistoryClient = Parameters<typeof fetchSkillVersionHistory>[0]["client"];
type FetchSkillCheckSavedClient = Parameters<typeof fetchSkillCheckSaved>[0]["client"];
type SaveSkillClient = Parameters<typeof saveSkillToDashboard>[0]["client"];
type UnsaveSkillClient = Parameters<typeof unsaveSkillFromDashboard>[0]["client"];

type SkillsBrowseMetaClient = Parameters<typeof fetchSkillsBrowseMeta>[0]["client"];
type SkillsBrowsePaginationClient = Parameters<typeof fetchSkillsBrowsePagination>[0]["client"];

describe("normalizeSkillsBrowseFilters", () => {
  test("trims inputs, deduplicates tags, and falls back to the default sort", () => {
    expect(
      normalizeSkillsBrowseFilters({
        category: "  operations-automation  ",
        q: "  workflow  ",
        tag: [" workflow ", "ops", "workflow", " "],
      }),
    ).toEqual({
      activeClass: "operations-automation",
      query: "workflow",
      sort: "downloads-all-time",
      tags: ["ops", "workflow"],
    });
  });
});

describe("fetchSkillsBrowseMeta", () => {
  test("loads the browse counts and taxonomy through the injected client", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      categories: {
        list: (input?: { all?: boolean; limit?: number }) => {
          calls.push({ categories: input ?? {} });
          return Promise.resolve([
            {
              count: 2,
              id: "cat-1",
              name: "Automation",
              slug: "operations-automation",
            },
          ]);
        },
      },
      metrics: {
        dailySkillsSnapshots: (input?: { limit?: number }) => {
          calls.push({ metrics: input ?? {} });
          return Promise.resolve([
            {
              day: "2024-01-01",
              newSkills: 3,
              newSnapshots: 1,
              updatedAtMs: 1710000000000,
            },
          ]);
        },
      },
      skills: {
        count: () => {
          calls.push({ skillsCount: true });
          return Promise.resolve(99);
        },
      },
      tags: {
        listIndexable: (input?: { limit?: number }) => {
          calls.push({ tags: input ?? {} });
          return Promise.resolve([
            {
              count: 5,
              id: "tag-1",
              slug: "workflow",
            },
          ]);
        },
      },
    } satisfies SkillsBrowseMetaClient;

    expect(
      fetchSkillsBrowseMeta({
        category: "  operations-automation  ",
        client,
        q: "  automation  ",
        sort: undefined,
        tag: [" workflow ", "workflow", "ops"],
      }),
    ).resolves.toEqual({
      categories: [
        {
          count: 2,
          id: "cat-1",
          name: "Automation",
          slug: "operations-automation",
        },
      ],
      counts: {
        activeFilters: 3,
        categories: 1,
        newSkills30d: 3,
        skills: 99,
      },
      tags: [
        {
          count: 5,
          id: "tag-1",
          slug: "workflow",
        },
      ],
    });

    expect(calls).toEqual([
      { categories: { all: true, limit: 100 } },
      { tags: { limit: 40 } },
      { skillsCount: true },
      { metrics: { limit: 30 } },
    ]);
  });
});

describe("fetchSkillsBrowsePagination", () => {
  test("forwards the normalized filters and cursor to search", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        search: (input?: {
          categories?: string[];
          cursor?: string;
          limit?: number;
          sort?: string;
          tags?: string[];
        }) => {
          calls.push({ search: input ?? {} });
          return Promise.resolve({
            continueCursor: "cursor-2",
            isDone: false,
            page: [
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
    } satisfies SkillsBrowsePaginationClient;

    await expect(
      fetchSkillsBrowsePagination({
        category: "  operations-automation  ",
        client,
        cursor: "cursor-1",
        q: "  automation  ",
        sort: undefined,
        tag: [" workflow ", "workflow", "ops"],
      }),
    ).resolves.toEqual({
      continueCursor: "cursor-2",
      isDone: false,
      page: [
        {
          description: "Builds workflows",
          id: "skill-1",
          slug: "workflow-builder",
          syncTime: 1710000000,
          title: "Workflow Builder",
        },
      ],
    });

    expect(calls).toEqual([
      {
        search: {
          categories: ["operations-automation"],
          cursor: "cursor-1",
          limit: 24,
          sort: "downloads-all-time",
          tags: ["ops", "workflow"],
        },
      },
    ]);
  });

  test("uses the same search helper for the first page without a cursor", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        search: (input?: {
          categories?: string[];
          cursor?: string;
          limit?: number;
          sort?: string;
          tags?: string[];
        }) => {
          calls.push({ search: input ?? {} });
          return Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: [],
          });
        },
      },
    } satisfies SkillsBrowsePaginationClient;

    await expect(
      fetchSkillsBrowseInitialPage({
        category: undefined,
        client,
        q: undefined,
        sort: "newest",
        tag: undefined,
      }),
    ).resolves.toEqual({
      continueCursor: "",
      isDone: true,
      page: [],
    });

    expect(calls).toEqual([
      {
        search: {
          categories: undefined,
          cursor: undefined,
          limit: 24,
          sort: "newest",
          tags: undefined,
        },
      },
    ]);
  });
});

describe("fetchSkillCheckSaved", () => {
  test("forwards the slug to the injected client", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        checkSaved: (input?: { slug: string }) => {
          calls.push({ checkSaved: input ?? {} });
          return Promise.resolve({
            saved: true,
          });
        },
      },
    } satisfies FetchSkillCheckSavedClient;

    await expect(
      fetchSkillCheckSaved({
        client,
        slug: "workflow-builder",
      }),
    ).resolves.toEqual({
      saved: true,
    });

    expect(calls).toEqual([
      {
        checkSaved: {
          slug: "workflow-builder",
        },
      },
    ]);
  });
});

describe("saveSkillToDashboard", () => {
  test("forwards the slug to the injected client", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        save: (input?: { slug: string }) => {
          calls.push({ save: input ?? {} });
          return Promise.resolve({
            alreadySaved: false,
            saved: true,
          });
        },
        unsave: () => Promise.resolve({ unsaved: true }),
      },
    } satisfies SaveSkillClient;

    await expect(
      saveSkillToDashboard({
        client,
        slug: "workflow-builder",
      }),
    ).resolves.toEqual({
      alreadySaved: false,
      saved: true,
    });

    expect(calls).toEqual([
      {
        save: {
          slug: "workflow-builder",
        },
      },
    ]);
  });
});

describe("unsaveSkillFromDashboard", () => {
  test("forwards the slug to the injected client", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        save: () => Promise.resolve({ alreadySaved: false, saved: true }),
        unsave: (input?: { slug: string }) => {
          calls.push({ unsave: input ?? {} });
          return Promise.resolve({
            unsaved: true,
          });
        },
      },
    } satisfies UnsaveSkillClient;

    await expect(
      unsaveSkillFromDashboard({
        client,
        slug: "workflow-builder",
      }),
    ).resolves.toEqual({
      unsaved: true,
    });

    expect(calls).toEqual([
      {
        unsave: {
          slug: "workflow-builder",
        },
      },
    ]);
  });
});

describe("resolveSnapshot", () => {
  test("prefers id, then version, then first snapshot", () => {
    const snapshots = [
      {
        description: "first",
        entryPath: "SKILL.md",
        hash: "hash-1",
        id: "snapshot-1",
        syncTime: 1,
        version: "v1",
      },
      {
        description: "second",
        entryPath: "README.md",
        hash: "hash-2",
        id: "snapshot-2",
        syncTime: 2,
        version: "v2",
      },
    ];

    expect(resolveSnapshot(snapshots, "snapshot-2")).toEqual({
      description: "second",
      entryPath: "README.md",
      hash: "hash-2",
      id: "snapshot-2",
      syncTime: 2,
      version: "v2",
    });
    expect(resolveSnapshot(snapshots, "v1")).toEqual(snapshots[0]);
    expect(resolveSnapshot(snapshots, "missing")).toEqual(snapshots[0]);
    expect(resolveSnapshot(snapshots, null)).toEqual(snapshots[0]);
    expect(resolveSnapshot([], null)).toBeNull();
  });
});

describe("resolveSkillBase", () => {
  test("resolves the canonical path and then loads the public skill by path", async () => {
    const calls: Array<{ kind: "resolve" | "get"; input: Record<string, string> }> = [];
    const client = {
      skills: {
        getByPath: (input: { authorHandle: string; repoName: string; skillSlug: string }) => {
          calls.push({ kind: "get", input });
          return Promise.resolve({
            description: "Builds things",
            id: "skill-1",
            latestVersion: "1.2.3",
            title: "Builder",
          });
        },
        resolvePathBySlug: ({ slug }: { slug: string }) => {
          calls.push({ kind: "resolve", input: { slug } });
          return Promise.resolve({
            authorHandle: "acme",
            repoName: "builder-repo",
            skillSlug: slug,
          });
        },
      },
    } satisfies ResolveSkillBaseClient;

    await expect(resolveSkillBase({ client, slug: "builder" })).resolves.toEqual({
      description: "Builds things",
      id: "skill-1",
      latestVersion: "1.2.3",
      title: "Builder",
    });

    expect(calls).toEqual([
      { kind: "resolve", input: { slug: "builder" } },
      {
        kind: "get",
        input: {
          authorHandle: "acme",
          repoName: "builder-repo",
          skillSlug: "builder",
        },
      },
    ]);
  });
});

describe("fetchSkillVersionHistory", () => {
  test("maps snapshots into version history entries", async () => {
    const calls: Array<{ limit?: number; skillId?: string }> = [];
    const client = {
      snapshots: {
        listBySkill: (input?: { limit?: number; skillId?: string }) => {
          calls.push(input ?? {});
          return Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: [
              {
                description: "current snapshot",
                entryPath: "SKILL.md",
                hash: "abcdef123456",
                id: "snapshot-1",
                sourceCommitDate: 1710000000000,
                syncTime: 1710000001000,
                version: "v1",
              },
              {
                description: "older snapshot",
                entryPath: "README.md",
                hash: "123456abcdef",
                id: "snapshot-2",
                syncTime: 1710000002000,
                version: "v2",
              },
            ],
          });
        },
      },
    } satisfies FetchSkillVersionHistoryClient;

    await expect(fetchSkillVersionHistory({ client, skillId: "skill-1" })).resolves.toEqual([
      {
        date: 1710000000000,
        entryPath: "SKILL.md",
        label: "current",
        snapshotId: "snapshot-1",
        version: "v1",
      },
      {
        date: 1710000002000,
        entryPath: "README.md",
        label: undefined,
        snapshotId: "snapshot-2",
        version: "v2",
      },
    ]);

    expect(calls).toEqual([{ limit: 3, skillId: "skill-1" }]);
  });
});
