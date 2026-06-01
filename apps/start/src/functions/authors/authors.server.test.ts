/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import {
  fetchAuthorDetail,
  fetchAuthorsPagination,
  fetchAuthorRepos,
  fetchAuthorSkillsPagination,
  fetchAuthorSkillsStats,
} from "./authors.server";

type AuthorDetailClient = Parameters<typeof fetchAuthorDetail>[0]["client"];
type AuthorsPaginationClient = Parameters<typeof fetchAuthorsPagination>[0]["client"];
type AuthorReposClient = Parameters<typeof fetchAuthorRepos>[0]["client"];
type AuthorSkillsPaginationClient = Parameters<typeof fetchAuthorSkillsPagination>[0]["client"];
type AuthorSkillsStatsClient = Parameters<typeof fetchAuthorSkillsStats>[0]["client"];

describe("fetchAuthorDetail", () => {
  test("forwards enriched author profiles from the public author contract", async () => {
    const client = {
      skills: {
        getAuthorByHandle: (input: { handle: string }) =>
          Promise.resolve({
            bio: "Builds useful tools.",
            githubUrl: `https://github.com/${input.handle}`,
            handle: input.handle,
            name: "Acme",
          }),
      },
    } satisfies AuthorDetailClient;

    await expect(
      fetchAuthorDetail({
        client,
        handle: "acme",
      }),
    ).resolves.toEqual({
      bio: "Builds useful tools.",
      githubUrl: "https://github.com/acme",
      handle: "acme",
      name: "Acme",
    });
  });
});

describe("fetchAuthorsPagination", () => {
  test("forwards cursor, limit, and sort to the public authors contract", async () => {
    const calls: Array<{ cursor?: string; limit?: number; sort?: "alphabetical" | "popular" }> = [];
    const client = {
      skills: {
        listAuthors: (input?: {
          cursor?: string;
          limit?: number;
          sort?: "alphabetical" | "popular";
        }) => {
          calls.push(input ?? {});
          return Promise.resolve({
            continueCursor: "cursor-2",
            isDone: false,
            page: [
              {
                handle: "acme",
                repoCount: 2,
                skillCount: 3,
              },
            ],
          });
        },
      },
    } satisfies AuthorsPaginationClient;

    await expect(
      fetchAuthorsPagination({
        client,
        cursor: "cursor-1",
        limit: 24,
        sort: "alphabetical",
      }),
    ).resolves.toEqual({
      continueCursor: "cursor-2",
      isDone: false,
      page: [
        {
          handle: "acme",
          repoCount: 2,
          skillCount: 3,
        },
      ],
    });

    expect(calls).toEqual([
      {
        cursor: "cursor-1",
        limit: 24,
        sort: "alphabetical",
      },
    ]);
  });
});

describe("fetchAuthorSkillsPagination", () => {
  test("forwards handle, repoName, cursor, limit, and sort to the public skill search contract", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        search: (input?: {
          authorHandle?: string;
          cursor?: string;
          limit?: number;
          repoName?: string;
          sort?: "downloads-all-time";
        }) => {
          calls.push(input ?? {});
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
    } as unknown as AuthorSkillsPaginationClient;

    expect(
      fetchAuthorSkillsPagination({
        client,
        cursor: "cursor-1",
        handle: "acme",
        limit: 24,
        repoName: "skills",
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
        authorHandle: "acme",
        cursor: "cursor-1",
        limit: 24,
        repoName: "skills",
        sort: "downloads-all-time",
      },
    ]);
  });
});

describe("fetchAuthorRepos", () => {
  test("forwards handle, cursor, and limit to the public repo contract", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      repos: {
        listByOwner: (input?: { cursor?: string; limit?: number; ownerHandle?: string }) => {
          calls.push(input ?? {});
          return Promise.resolve({
            continueCursor: "cursor-2",
            isDone: false,
            repos: [
              {
                nameWithOwner: "acme/widget",
                repoName: "widget",
                repoOwner: "acme",
                skillCount: 3,
              },
            ],
          });
        },
      },
    } as unknown as AuthorReposClient;

    await expect(
      fetchAuthorRepos({
        client,
        cursor: "cursor-1",
        handle: "acme",
        limit: 6,
      }),
    ).resolves.toEqual({
      continueCursor: "cursor-2",
      isDone: false,
      repos: [
        {
          nameWithOwner: "acme/widget",
          repoName: "widget",
          repoOwner: "acme",
          skillCount: 3,
        },
      ],
    });

    expect(calls).toEqual([
      {
        cursor: "cursor-1",
        limit: 6,
        ownerHandle: "acme",
      },
    ]);
  });
});

describe("fetchAuthorSkillsStats", () => {
  test("aggregates all pages of the author's skills into summary stats", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        search: (input?: {
          authorHandle?: string;
          cursor?: string;
          limit?: number;
          sort?: "downloads-all-time";
        }) => {
          calls.push(input ?? {});

          if (!input?.cursor) {
            return Promise.resolve({
              continueCursor: "cursor-2",
              isDone: false,
              page: [
                {
                  description: "Builds workflows",
                  downloadsAllTime: 10,
                  id: "skill-1",
                  repoName: "repo-a",
                  slug: "workflow-builder",
                  staticAudit: { overallScore: 80 },
                  stargazerCount: 2,
                  syncTime: 1710000000,
                  title: "Workflow Builder",
                },
              ],
            });
          }

          return Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: [
              {
                description: "Automates ops",
                downloadsAllTime: 30,
                id: "skill-2",
                repoName: "repo-b",
                slug: "ops-automator",
                staticAudit: { overallScore: 60 },
                stargazerCount: 4,
                syncTime: 1710000001,
                title: "Ops Automator",
              },
            ],
          });
        },
      },
    } as unknown as AuthorSkillsStatsClient;

    await expect(
      fetchAuthorSkillsStats({
        client,
        handle: "acme",
      }),
    ).resolves.toEqual({
      averageAuditScore: 70,
      skillCount: 2,
      totalDownloads: 40,
      totalStars: 6,
    });

    expect(calls).toEqual([
      {
        authorHandle: "acme",
        limit: 100,
        sort: "downloads-all-time",
      },
      {
        authorHandle: "acme",
        cursor: "cursor-2",
        limit: 100,
        sort: "downloads-all-time",
      },
    ]);
  });

  test("counts repo stars only once when multiple skills share the same repo", async () => {
    const client = {
      skills: {
        search: () =>
          Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: [
              {
                description: "Skill A",
                downloadsAllTime: 5,
                id: "skill-a",
                repoName: "shared-repo",
                slug: "skill-a",
                staticAudit: { overallScore: 90 },
                stargazerCount: 1000,
                syncTime: 1710000000,
                title: "Skill A",
              },
              {
                description: "Skill B",
                downloadsAllTime: 15,
                id: "skill-b",
                repoName: "shared-repo",
                slug: "skill-b",
                staticAudit: { overallScore: 50 },
                stargazerCount: 1000,
                syncTime: 1710000001,
                title: "Skill B",
              },
            ],
          }),
      },
    } as unknown as AuthorSkillsStatsClient;

    await expect(fetchAuthorSkillsStats({ client, handle: "acme" })).resolves.toEqual({
      averageAuditScore: 70,
      skillCount: 2,
      totalDownloads: 20,
      totalStars: 1000,
    });
  });
});
