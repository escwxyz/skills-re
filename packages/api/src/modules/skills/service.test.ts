/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { SkillsUploadContentPayload } from "../../types";
import { encodeRepoCursor } from "../repos/cursor";
import type { SearchSkillRow } from "../shared/search-skill";
import {
  aiSearch,
  createSkillsService,
  submitGithubPreparedPublic,
  submitGithubRepoPublic,
  uploadSkills,
} from "./service";

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
};

describe("skills service", () => {
  test("returns paginated authors from the public authors list contract", async () => {
    const calls: { cursor?: string; limit?: number; sort?: "alphabetical" | "popular" }[] = [];
    const service = createSkillsService({
      listAuthors: (input) => {
        calls.push(input ?? {});
        return Promise.resolve({
          continueCursor: "",
          isDone: true,
          page: [
            {
              avatarUrl: null,
              bio: "Builds useful tools.",
              displayName: "Acme",
              githubUrl: "https://github.com/acme",
              handle: "acme",
              isVerified: 1,
              name: "Acme",
              repoCount: 2,
              skillCount: 3,
            },
            {
              avatarUrl: null,
              bio: null,
              displayName: "Beta",
              githubUrl: "https://github.com/beta",
              handle: "beta",
              isVerified: 0,
              name: "Beta",
              repoCount: 1,
              skillCount: 1,
            },
          ],
        });
      },
    });

    await expect(
      (service as any).listAuthors({ cursor: "cursor-1", limit: 2, sort: "alphabetical" }),
    ).resolves.toEqual({
      continueCursor: "",
      isDone: true,
      page: [
        {
          avatarUrl: undefined,
          bio: "Builds useful tools.",
          githubUrl: "https://github.com/acme",
          handle: "acme",
          isVerified: true,
          name: "Acme",
          repoCount: 2,
          skillCount: 3,
        },
        {
          avatarUrl: undefined,
          bio: undefined,
          githubUrl: "https://github.com/beta",
          handle: "beta",
          isVerified: false,
          name: "Beta",
          repoCount: 1,
          skillCount: 1,
        },
      ],
    });
    expect(calls).toEqual([
      {
        cursor: "cursor-1",
        limit: 2,
        sort: "alphabetical",
      },
    ]);
  });

  test("counts public authors with verified coverage", async () => {
    const service = createSkillsService({
      countAuthors: () =>
        Promise.resolve({
          authorsCount: 12,
          verifiedCount: 4,
        }),
    });

    await expect(service.countAuthors()).resolves.toEqual({
      authorsCount: 12,
      verifiedCount: 4,
    });
  });

  test("maps list cursors and public skill fields using the contract shape", async () => {
    const calls: { cursor?: string; limit?: number }[] = [];
    const service = createSkillsService({
      listSkillsPageBySyncTime: (input) => {
        calls.push({
          cursor: input?.cursor,
          limit: input?.limit,
        });

        return Promise.resolve({
          continueCursor: encodeRepoCursor({
            id: "skill-2",
            syncTime: 456,
          }),
          isDone: false,
          page: [
            {
              description: "Widget skill",
              id: "skill-1",
              slug: "widget",
              syncTime: 123,
              title: "Widget",
            },
          ],
        });
      },
    });

    await expect(
      service.list({
        cursor: encodeRepoCursor({
          id: "skill-0",
          syncTime: 100,
        }),
        limit: 10,
      }),
    ).resolves.toEqual({
      continueCursor: encodeRepoCursor({
        id: "skill-2",
        syncTime: 456,
      }),
      isDone: false,
      page: [
        {
          description: "Widget skill",
          id: "skill-1",
          slug: "widget",
          syncTime: 123,
          title: "Widget",
        },
      ],
    });

    expect(calls).toEqual([
      {
        cursor: encodeRepoCursor({
          id: "skill-0",
          syncTime: 100,
        }),
        limit: 10,
      },
    ]);
  });

  test("maps author profiles into the public author shape", async () => {
    const service = createSkillsService({
      findAuthorByHandle: (handle) =>
        Promise.resolve({
          avatarUrl: null,
          githubUrl: `https://github.com/${handle}`,
          handle,
          isVerified: 1,
          bio: "Maintains the widget stack.",
          name: "Widget Author",
          repoCount: 2,
          skillCount: 3,
        }),
    });

    await expect(service.getAuthorByHandle({ handle: "acme" })).resolves.toEqual({
      avatarUrl: undefined,
      bio: "Maintains the widget stack.",
      githubUrl: "https://github.com/acme",
      handle: "acme",
      isVerified: true,
      name: "Widget Author",
      repoCount: 2,
      skillCount: 3,
    });
  });

  test("forwards repo filters to the public skill search contract", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const service = createSkillsService({
      searchSkillsPageByFilters: (input) => {
        calls.push(input ?? {});
        return Promise.resolve({
          continueCursor: "",
          isDone: true,
          page: [
            {
              authorHandle: "acme",
              createdAt: 123,
              description: "Widget skill",
              downloadsAllTime: 10,
              downloadsTrending: 1,
              forkCount: 0,
              id: "skill-1",
              isVerified: true,
              latestVersion: "1.0.0",
              license: "MIT",
              ownerAvatarUrl: null,
              primaryCategory: null,
              repoName: "skills",
              repoUrl: "https://github.com/acme/skills",
              slug: "widget",
              stargazerCount: 5,
              syncTime: 123,
              title: "Widget",
              updatedAt: 123,
              viewsAllTime: 42,
            } as any,
          ],
        } as any);
      },
    });

    await expect(
      service.search({
        authorHandle: "acme",
        repoName: "skills",
      }),
    ).resolves.toMatchObject({
      continueCursor: "",
      isDone: true,
      page: [
        {
          authorHandle: "acme",
          author: {
            avatarUrl: undefined,
            githubUrl: "https://github.com/acme",
            handle: "acme",
          },
          repoName: "skills",
          slug: "widget",
          title: "Widget",
        },
      ],
    });

    expect(calls).toEqual([
      {
        authorHandle: "acme",
        repoName: "skills",
      },
    ]);
  });

  test("routes explicit keyword queries through the database search path", async () => {
    const filterCalls: Array<Record<string, unknown>> = [];
    const ftsCalls: Array<Record<string, unknown>> = [];
    const aiCalls: unknown[] = [];
    const service = createSkillsService({
      searchSkillsPageByFts: (input) => {
        ftsCalls.push(input);
        return Promise.resolve(null);
      },
      searchSkillsPageByFilters: (input) => {
        filterCalls.push(input ?? {});
        return Promise.resolve({
          continueCursor: "",
          isDone: true,
          page: [
            {
              authorHandle: "acme",
              createdAt: 123,
              description: "Workflow skill",
              downloadsAllTime: 10,
              downloadsTrending: 1,
              forkCount: 0,
              id: "skill-1",
              isVerified: true,
              latestVersion: "1.0.0",
              license: "MIT",
              ownerAvatarUrl: null,
              primaryCategory: null,
              repoName: "skills",
              repoUrl: "https://github.com/acme/skills",
              slug: "workflow",
              stargazerCount: 5,
              syncTime: 123,
              title: "Workflow",
              updatedAt: 123,
              viewsAllTime: 42,
            } as any,
          ],
        } as any);
      },
    });

    const result = await service.search(
      {
        limit: 24,
        query: "workflow",
        searchMode: "keyword",
      },
      {
        search(input) {
          aiCalls.push(input);
          return Promise.resolve({ data: [] });
        },
      },
    );

    expect(result).toMatchObject({
      continueCursor: "",
      isDone: true,
      page: [
        {
          authorHandle: "acme",
          repoName: "skills",
          slug: "workflow",
          title: "Workflow",
        },
      ],
    });
    expect(filterCalls).toEqual([
      {
        limit: 24,
        query: "workflow",
        searchMode: "keyword",
      },
    ]);
    expect(ftsCalls).toEqual([]);
    expect(aiCalls).toEqual([]);
  });

  test("routes configured FTS5 keyword queries through the FTS repository", async () => {
    const filterCalls: Array<Record<string, unknown>> = [];
    const ftsCalls: Array<Record<string, unknown>> = [];
    const aiCalls: unknown[] = [];
    const service = createSkillsService({
      searchSkillsPageByFilters: (input) => {
        filterCalls.push(input ?? {});
        return Promise.resolve({
          continueCursor: "",
          isDone: true,
          page: [],
        });
      },
      searchSkillsPageByFts: (input) => {
        ftsCalls.push(input);
        return Promise.resolve({
          continueCursor: "fts-cursor",
          isDone: false,
          page: [
            {
              authorHandle: "acme",
              createdAt: 123,
              description: "FTS workflow skill",
              downloadsAllTime: 10,
              downloadsTrending: 1,
              forkCount: 0,
              id: "skill-fts",
              isVerified: true,
              latestVersion: "1.0.0",
              license: "MIT",
              ownerAvatarUrl: null,
              primaryCategory: "automation",
              repoName: "skills",
              repoUrl: "https://github.com/acme/skills",
              slug: "fts-workflow",
              stargazerCount: 5,
              syncTime: 123,
              tags: ["search"],
              title: "FTS Workflow",
              updatedAt: 124,
              viewsAllTime: 42,
            },
          ],
        });
      },
    });

    const result = await service.search(
      {
        authorHandle: "acme",
        cursor: "cursor-1",
        limit: 24,
        minAuditScore: 80,
        minScore: 70,
        query: "workflow",
        searchMode: "keyword",
        tags: ["search"],
      },
      {
        search(input) {
          aiCalls.push(input);
          return Promise.resolve({ data: [] });
        },
      },
      {
        authoritativeEngine: "fts5",
        shadowCompareFts5: false,
        strategy: "fts5",
      },
    );

    expect(result).toMatchObject({
      continueCursor: "fts-cursor",
      isDone: false,
      page: [
        {
          authorHandle: "acme",
          repoName: "skills",
          slug: "fts-workflow",
          tags: ["search"],
          title: "FTS Workflow",
        },
      ],
    });
    expect(ftsCalls).toEqual([
      {
        authorHandle: "acme",
        cursor: "cursor-1",
        limit: 24,
        minAuditScore: 80,
        minScore: 70,
        query: "workflow",
        searchMode: "keyword",
        tags: ["search"],
      },
    ]);
    expect(filterCalls).toEqual([]);
    expect(aiCalls).toEqual([]);
  });

  test("falls back to the LIKE path when configured FTS5 cannot build a valid query", async () => {
    const filterCalls: Array<Record<string, unknown>> = [];
    const ftsCalls: Array<Record<string, unknown>> = [];
    const service = createSkillsService({
      searchSkillsPageByFilters: (input) => {
        filterCalls.push(input ?? {});
        return Promise.resolve({
          continueCursor: "",
          isDone: true,
          page: [],
        });
      },
      searchSkillsPageByFts: (input) => {
        ftsCalls.push(input);
        return Promise.resolve(null);
      },
    });

    await expect(
      service.search(
        {
          query: "✨",
          searchMode: "keyword",
        },
        undefined,
        {
          authoritativeEngine: "fts5",
          shadowCompareFts5: false,
          strategy: "fts5",
        },
      ),
    ).resolves.toEqual({
      continueCursor: "",
      isDone: true,
      page: [],
    });
    expect(ftsCalls).toEqual([
      {
        query: "✨",
        searchMode: "keyword",
      },
    ]);
    expect(filterCalls).toEqual([
      {
        query: "✨",
        searchMode: "keyword",
      },
    ]);
  });

  test("records shadow comparison metrics without changing the authoritative LIKE response", async () => {
    const metrics: unknown[] = [];
    const waitUntilPromises: Promise<unknown>[] = [];
    const ftsResult = createDeferred<{
      continueCursor: string;
      isDone: boolean;
      page: SearchSkillRow[];
    }>();
    let ftsStarted = false;
    const service = createSkillsService({
      searchSkillsPageByFilters: () =>
        Promise.resolve({
          continueCursor: "",
          isDone: true,
          page: [
            {
              authorHandle: "acme",
              createdAt: 123,
              description: "LIKE workflow skill",
              downloadsAllTime: 10,
              downloadsTrending: 1,
              forkCount: 0,
              id: "skill-like-1",
              isVerified: true,
              latestVersion: "1.0.0",
              license: "MIT",
              ownerAvatarUrl: null,
              primaryCategory: "automation",
              repoName: "skills",
              repoUrl: "https://github.com/acme/skills",
              slug: "like-workflow",
              stargazerCount: 5,
              syncTime: 123,
              title: "LIKE Workflow",
              updatedAt: 124,
              viewsAllTime: 42,
            },
            {
              authorHandle: "acme",
              createdAt: 123,
              description: "Shared workflow skill",
              downloadsAllTime: 10,
              downloadsTrending: 1,
              forkCount: 0,
              id: "skill-shared",
              isVerified: true,
              latestVersion: "1.0.0",
              license: "MIT",
              ownerAvatarUrl: null,
              primaryCategory: "automation",
              repoName: "skills",
              repoUrl: "https://github.com/acme/skills",
              slug: "shared-workflow",
              stargazerCount: 5,
              syncTime: 123,
              title: "Shared Workflow",
              updatedAt: 124,
              viewsAllTime: 42,
            },
          ],
        }),
      searchSkillsPageByFts: () => {
        ftsStarted = true;
        return ftsResult.promise;
      },
    });

    const searchPromise = service.search(
      {
        query: "workflow",
        searchMode: "keyword",
      },
      undefined,
      {
        authoritativeEngine: "like",
        shadowCompareFts5: true,
        strategy: "shadow",
      },
      {
        recordShadowComparison: (metric) => {
          metrics.push(metric);
          throw new Error("telemetry unavailable");
        },
        waitUntil: (promise) => {
          waitUntilPromises.push(promise);
        },
      },
    );
    await Promise.resolve();

    expect(ftsStarted).toBe(true);

    const result = await searchPromise;

    expect(result).toMatchObject({
      page: [
        {
          id: "skill-like-1",
          slug: "like-workflow",
        },
        {
          id: "skill-shared",
          slug: "shared-workflow",
        },
      ],
    });
    expect(metrics).toEqual([]);
    expect(waitUntilPromises).toHaveLength(1);

    ftsResult.resolve({
      continueCursor: "",
      isDone: true,
      page: [
        {
          authorHandle: "acme",
          createdAt: 123,
          description: "Shared workflow skill",
          downloadsAllTime: 10,
          downloadsTrending: 1,
          forkCount: 0,
          id: "skill-shared",
          isVerified: true,
          latestVersion: "1.0.0",
          license: "MIT",
          ownerAvatarUrl: null,
          primaryCategory: "automation",
          repoName: "skills",
          repoUrl: "https://github.com/acme/skills",
          slug: "shared-workflow",
          stargazerCount: 5,
          syncTime: 123,
          title: "Shared Workflow",
          updatedAt: 124,
          viewsAllTime: 42,
        },
        {
          authorHandle: "acme",
          createdAt: 123,
          description: "Invalid candidate row",
          downloadsAllTime: 10,
          downloadsTrending: 1,
          forkCount: 0,
          id: "skill-invalid",
          isVerified: true,
          latestVersion: "1.0.0",
          license: "MIT",
          ownerAvatarUrl: null,
          primaryCategory: "automation",
          repoName: "skills",
          repoUrl: "https://github.com/acme/skills",
          slug: "Invalid Slug",
          stargazerCount: 5,
          syncTime: 123,
          title: "Invalid Candidate",
          updatedAt: 124,
          viewsAllTime: 42,
        },
      ],
    });
    await Promise.all(waitUntilPromises);

    expect(metrics).toEqual([
      expect.objectContaining({
        authoritativeEngine: "like",
        authoritativeResultCount: 2,
        candidateEngine: "fts5",
        candidateResultCount: 1,
        failed: false,
        topResultOverlap: 0.5,
        topResultSampleSize: 2,
        zeroResultChanged: false,
      }),
    ]);
  });

  test("records bounded shadow failure metrics and keeps LIKE results authoritative", async () => {
    const metrics: unknown[] = [];
    const failures: unknown[] = [];
    const waitUntilPromises: Promise<unknown>[] = [];
    const service = createSkillsService({
      searchSkillsPageByFilters: () =>
        Promise.resolve({
          continueCursor: "",
          isDone: true,
          page: [
            {
              authorHandle: "acme",
              createdAt: 123,
              description: "LIKE workflow skill",
              downloadsAllTime: 10,
              downloadsTrending: 1,
              forkCount: 0,
              id: "skill-like",
              isVerified: true,
              latestVersion: "1.0.0",
              license: "MIT",
              ownerAvatarUrl: null,
              primaryCategory: "automation",
              repoName: "skills",
              repoUrl: "https://github.com/acme/skills",
              slug: "like-workflow",
              stargazerCount: 5,
              syncTime: 123,
              title: "LIKE Workflow",
              updatedAt: 124,
              viewsAllTime: 42,
            },
          ],
        }),
      searchSkillsPageByFts: () => Promise.reject(new Error("fts unavailable")),
    });

    await expect(
      service.search(
        {
          query: "workflow",
          searchMode: "keyword",
        },
        undefined,
        {
          authoritativeEngine: "like",
          shadowCompareFts5: true,
          strategy: "shadow",
        },
        {
          recordQueryFailure: (failure) => {
            failures.push(failure);
            return Promise.reject(new Error("failure telemetry unavailable"));
          },
          recordShadowComparison: (metric) => {
            metrics.push(metric);
            return Promise.reject(new Error("comparison telemetry unavailable"));
          },
          waitUntil: (promise) => {
            waitUntilPromises.push(promise);
          },
        },
      ),
    ).resolves.toMatchObject({
      page: [
        {
          id: "skill-like",
          slug: "like-workflow",
        },
      ],
    });
    await Promise.all(waitUntilPromises);

    expect(metrics).toEqual([
      expect.objectContaining({
        authoritativeEngine: "like",
        authoritativeResultCount: 1,
        candidateEngine: "fts5",
        candidateResultCount: 0,
        failed: true,
        topResultOverlap: 0,
        topResultSampleSize: 0,
        zeroResultChanged: true,
      }),
    ]);
    expect(failures).toEqual([
      expect.objectContaining({
        engine: "fts5",
        fallbackApplied: true,
        phase: "shadow",
        strategy: "shadow",
      }),
    ]);
  });

  test("records authoritative FTS failures without falling back to LIKE", async () => {
    const failures: unknown[] = [];
    const filterCalls: unknown[] = [];
    const service = createSkillsService({
      searchSkillsPageByFilters: (input) => {
        filterCalls.push(input);
        return Promise.resolve({
          continueCursor: "",
          isDone: true,
          page: [],
        });
      },
      searchSkillsPageByFts: () => Promise.reject(new Error("fts unavailable")),
    });

    await expect(
      service.search(
        {
          query: "workflow",
          searchMode: "keyword",
        },
        undefined,
        {
          authoritativeEngine: "fts5",
          shadowCompareFts5: false,
          strategy: "fts5",
        },
        {
          recordQueryFailure: (failure) => {
            failures.push(failure);
          },
          recordShadowComparison: () => undefined,
        },
      ),
    ).rejects.toThrow("FTS keyword search failed.");

    expect(filterCalls).toEqual([]);
    expect(failures).toEqual([
      expect.objectContaining({
        engine: "fts5",
        fallbackApplied: false,
        phase: "authoritative",
        strategy: "fts5",
      }),
    ]);
  });

  test("preserves keyword search filters, pagination, and result-card shape through database search", async () => {
    const filterCalls: Array<Record<string, unknown>> = [];
    const service = createSkillsService({
      searchSkillsPageByFilters: (input) => {
        filterCalls.push(input ?? {});
        return Promise.resolve({
          continueCursor: "cursor-next",
          isDone: false,
          page: [
            {
              authorHandle: "acme",
              createdAt: 123,
              description: "Workflow skill",
              downloadsAllTime: 10,
              downloadsTrending: 1,
              forkCount: 0,
              id: "skill-1",
              isVerified: true,
              latestAuditScore: 92,
              latestSnapshotId: "snapshot-1",
              latestSnapshotTotalBytes: 2048,
              latestVersion: "1.0.0",
              license: "MIT",
              ownerAvatarUrl: "https://example.com/avatar.png",
              primaryCategory: "automation",
              repoName: "skills",
              repoUrl: "https://github.com/acme/skills",
              slug: "workflow",
              stargazerCount: 5,
              syncTime: 123,
              tags: ["automation", "search"],
              title: "Workflow",
              updatedAt: 124,
              viewsAllTime: 42,
            },
          ],
        });
      },
    });

    await expect(
      service.search({
        authorHandle: "acme",
        categories: ["automation"],
        cursor: "cursor-1",
        limit: 24,
        minAuditScore: 80,
        minScore: 70,
        query: "workflow",
        repoName: "skills",
        searchMode: "keyword",
        sort: "downloads-all-time",
        tags: ["search"],
      }),
    ).resolves.toEqual({
      continueCursor: "cursor-next",
      isDone: false,
      page: [
        {
          author: {
            avatarUrl: "https://example.com/avatar.png",
            githubUrl: "https://github.com/acme",
            handle: "acme",
          },
          authorHandle: "acme",
          createdAt: 123,
          description: "Workflow skill",
          downloadsAllTime: 10,
          downloadsTrending: 1,
          forkCount: 0,
          id: "skill-1",
          isVerified: true,
          latestAuditScore: 92,
          latestSnapshotId: "snapshot-1",
          latestSnapshotTotalBytes: 2048,
          latestVersion: "1.0.0",
          license: "MIT",
          primaryCategory: "automation",
          repoName: "skills",
          repoUrl: "https://github.com/acme/skills",
          slug: "workflow",
          stargazerCount: 5,
          syncTime: 123,
          tags: ["automation", "search"],
          title: "Workflow",
          updatedAt: 124,
          viewsAllTime: 42,
        },
      ],
    });
    expect(filterCalls).toEqual([
      {
        authorHandle: "acme",
        categories: ["automation"],
        cursor: "cursor-1",
        limit: 24,
        minAuditScore: 80,
        minScore: 70,
        query: "workflow",
        repoName: "skills",
        searchMode: "keyword",
        sort: "downloads-all-time",
        tags: ["search"],
      },
    ]);
  });

  test("routes explicit semantic queries through AI Search", async () => {
    const filterCalls: unknown[] = [];
    const ftsCalls: unknown[] = [];
    const aiCalls: unknown[] = [];
    const service = createSkillsService({
      findSkillByPath: () => Promise.resolve(null),
      findSkillBySlug: () => Promise.resolve(null),
      searchSkillsPageByFts: (input) => {
        ftsCalls.push(input);
        return Promise.resolve({
          continueCursor: "",
          isDone: true,
          page: [],
        });
      },
      searchSkillsPageByFilters: (input) => {
        filterCalls.push(input);
        return Promise.resolve({
          continueCursor: "",
          isDone: true,
          page: [],
        });
      },
    });

    const result = await service.search(
      {
        query: "workflow",
        rewriteQuery: false,
        searchMode: "semantic",
      },
      {
        search(input) {
          aiCalls.push(input);
          return Promise.resolve({
            data: [],
            has_more: false,
            search_query: "workflow",
          });
        },
      },
      {
        authoritativeEngine: "fts5",
        shadowCompareFts5: false,
        strategy: "fts5",
      },
    );

    expect(result).toMatchObject({
      ai: {
        resolvedSkillsCount: 0,
        resultCount: 0,
      },
      continueCursor: "",
      isDone: true,
      page: [],
    });
    expect(aiCalls).toEqual([
      {
        query: "workflow",
        rewriteQuery: false,
      },
    ]);
    expect(ftsCalls).toEqual([]);
    expect(filterCalls).toEqual([]);
  });

  test("claims a skill when the authenticated github handle matches the repo owner", async () => {
    const claimed: { skillId: string; userId: string }[] = [];
    const service = createSkillsService({
      claimSkillById: (input) => {
        claimed.push(input);
        return Promise.resolve();
      },
      findSkillClaimContextBySlug: (slug) =>
        Promise.resolve(
          slug === "widget"
            ? {
                claimedUserId: null,
                repoOwnerHandle: "acme",
                skillId: "skill-1",
              }
            : null,
        ),
    });

    await expect(
      service.claimAsAuthor({
        githubHandle: "  acme  ",
        slug: "widget",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      alreadyClaimed: false,
      claimed: true,
    });
    expect(claimed).toEqual([
      {
        skillId: "skill-1",
        userId: "user-1",
      },
    ]);
  });

  test("returns alreadyClaimed when the same account claims again", async () => {
    const claimed: { skillId: string; userId: string }[] = [];
    const service = createSkillsService({
      claimSkillById: (input) => {
        claimed.push(input);
        return Promise.resolve();
      },
      findSkillClaimContextBySlug: () =>
        Promise.resolve({
          claimedUserId: "user-1",
          repoOwnerHandle: "acme",
          skillId: "skill-1",
        }),
    });

    await expect(
      service.claimAsAuthor({
        githubHandle: "acme",
        slug: "widget",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      alreadyClaimed: true,
      claimed: true,
    });
    expect(claimed).toEqual([]);
  });

  test("rejects claims when the github handle does not match the repo owner", async () => {
    const service = createSkillsService({
      findSkillClaimContextBySlug: () =>
        Promise.resolve({
          claimedUserId: null,
          repoOwnerHandle: "acme",
          skillId: "skill-1",
        }),
    });

    await expect(
      service.claimAsAuthor({
        githubHandle: "other",
        slug: "widget",
        userId: "user-1",
      }),
    ).rejects.toThrow("Your GitHub handle does not match this skill owner.");
  });

  test("rejects claims without a linked github account", async () => {
    const service = createSkillsService();

    await expect(
      service.claimAsAuthor({
        githubHandle: null,
        slug: "widget",
        userId: "user-1",
      }),
    ).rejects.toThrow("Your account must be linked to GitHub before claiming.");
  });

  test("includes skill tags when resolving a public skill by path", async () => {
    const service = createSkillsService({
      findSkillByPath: (input) =>
        Promise.resolve(
          input.authorHandle === "acme" && input.skillSlug === "widget"
            ? {
                authorHandle: "acme",
                createdAt: 11,
                description: "Widget skill",
                downloadsAllTime: 22,
                downloadsTrending: 33,
                forkCount: 44,
                id: "skill-1",
                isVerified: true,
                latestVersion: "1.0.0",
                license: "MIT",
                primaryCategory: "productivity",
                repoName: "skills",
                repoUrl: "https://github.com/acme/skills",
                slug: "widget",
                stargazerCount: 55,
                syncTime: 66,
                tags: ["automation", "workflow"],
                title: "Widget",
                updatedAt: 77,
                viewsAllTime: 88,
              }
            : null,
        ),
    });

    await expect(
      service.getByPath({
        authorHandle: "acme",
        repoName: "skills",
        skillSlug: "widget",
      }),
    ).resolves.toMatchObject({
      authorHandle: "acme",
      repoName: "skills",
      slug: "widget",
      tags: ["automation", "workflow"],
      title: "Widget",
    });
  });

  test("resolves ai search results into the public search shape", async () => {
    const service = createSkillsService({
      findSkillByPath: (input) =>
        Promise.resolve(
          input.authorHandle === "acme" && input.skillSlug === "widget"
            ? {
                authorHandle: "acme",
                createdAt: 11,
                description: "Widget skill",
                downloadsAllTime: 22,
                downloadsTrending: 33,
                forkCount: 44,
                id: "skill-1",
                isVerified: true,
                latestVersion: "1.0.0",
                license: "MIT",
                primaryCategory: "productivity",
                repoName: "skills",
                repoUrl: "https://github.com/acme/skills",
                slug: "widget",
                stargazerCount: 55,
                syncTime: 66,
                tags: ["automation"],
                title: "Widget",
                updatedAt: 77,
                viewsAllTime: 88,
              }
            : null,
        ),
      findSkillBySlug: () => Promise.resolve(null),
    });

    const result = await service.search(
      {
        query: "widget",
        rewriteQuery: false,
      },
      {
        search() {
          return Promise.resolve({
            data: [
              {
                content: [{ text: "Widget docs" }],
                key: "acme/skills/skills/widget/skill.md",
                score: 0.9,
              },
              {
                slug: "widget",
              },
            ],
            has_more: false,
            search_query: "widget",
          });
        },
      },
    );

    expect(result.ai).toMatchObject({
      raw: {
        resolution: {
          pathCandidatesCount: 1,
          slugCandidatesCount: 1,
        },
      },
      resolvedSkillsCount: 1,
      resultCount: 2,
    });
    expect(result.page[0]).toMatchObject({
      aiMatch: {
        itemKey: "acme/skills/skills/widget/skill.md",
        score: 0.9,
        snippet: "Widget docs",
        sourcePath: "acme/skills/skills/widget/skill.md",
      },
      authorHandle: "acme",
      createdAt: 11,
      description: "Widget skill",
      id: "skill-1",
      repoName: "skills",
      slug: "widget",
      title: "Widget",
    });
    expect(result.continueCursor).toBe("");
    expect(result.isDone).toBe(true);
  });

  test("forwards raw ai search requests to the injected runtime", async () => {
    const calls: unknown[] = [];

    await expect(
      aiSearch(
        {
          query: "widget",
          rewriteQuery: true,
        },
        {
          search(input) {
            calls.push(input);
            return Promise.resolve({
              data: [],
              has_more: true,
            });
          },
        },
      ),
    ).resolves.toEqual({
      data: [],
      has_more: true,
    });

    expect(calls).toEqual([
      {
        query: "widget",
        rewriteQuery: true,
      },
    ]);
  });

  test("forwards upload payloads to the workflow scheduler", async () => {
    const payload = {
      recentCommits: [{ sha: "abc123" }],
      repo: {
        createdAt: 1,
        defaultBranch: "main",
        forks: 2,
        license: "MIT",
        nameWithOwner: "example/skills",
        owner: {
          handle: "example",
        },
        stars: 3,
        updatedAt: 4,
      },
      skills: [
        {
          description: "Example skill",
          directoryPath: "skills/example",
          entryPath: "skills/example/skill.md",
          initialSnapshot: {
            files: [{ content: "hello", path: "skills/example/skill.md" }],
            sourceCommitDate: 1,
            sourceCommitSha: "abc123",
            sourceRef: "main",
            tree: [{ path: "skills/example/skill.md", sha: "abc123", type: "blob" as const }],
          },
          slug: "example-skill",
          sourceLocator: "github:example/skills/skills/example/skill.md",
          sourceType: "github" as const,
          title: "Example skill",
        },
      ],
    };

    const scheduled: SkillsUploadContentPayload[] = [];
    const result = await uploadSkills(payload, {
      enqueue: (input) => {
        scheduled.push(input);
        return Promise.resolve({ workId: "workflow-1" });
      },
    });

    expect(result).toEqual({
      ids: [],
      workId: "workflow-1",
    });
    expect(scheduled).toEqual([payload]);
  });

  test("submits a public github repo by building a payload and scheduling upload", async () => {
    const submitted: {
      input: unknown;
      payload: unknown;
    }[] = [];

    const result = await submitGithubRepoPublic(
      { owner: "example", repo: "skills" },
      {
        buildPayload: (input) => {
          submitted.push({
            input,
            payload: null,
          });
          return Promise.resolve({
            payload: {
              recentCommits: [{ sha: "abc123" }],
              repo: {
                createdAt: 1,
                defaultBranch: "main",
                forks: 2,
                license: "MIT",
                nameWithOwner: "example/skills",
                owner: {
                  handle: "example",
                },
                stars: 3,
                updatedAt: 4,
              },
              skills: [
                {
                  description: "Example skill",
                  directoryPath: "skills/example",
                  entryPath: "skills/example/skill.md",
                  initialSnapshot: {
                    files: [{ content: "hello", path: "skills/example/skill.md" }],
                    sourceCommitDate: 1,
                    sourceCommitSha: "abc123",
                    sourceRef: "main",
                    tree: [
                      { path: "skills/example/skill.md", sha: "abc123", type: "blob" as const },
                    ],
                  },
                  slug: "example-skill",
                  sourceLocator: "github:example/skills/skills/example/skill.md",
                  sourceType: "github" as const,
                  title: "Example skill",
                },
              ],
            },
          });
        },
      },
      {
        enqueue: (input) => {
          submitted.push({
            input: null,
            payload: input,
          });
          return Promise.resolve({ workId: "workflow-1" });
        },
      },
    );

    expect(result).toEqual({
      skillsCount: 1,
      status: "submitted",
      workflowId: "workflow-1",
    });
    expect(submitted).toHaveLength(2);
  });

  test("submits only the selected github skill roots", async () => {
    const scheduledPayloads: SkillsUploadContentPayload[] = [];

    const result = await submitGithubRepoPublic(
      {
        owner: "example",
        repo: "skills",
        skillRootPaths: ["skills/selected"],
      },
      {
        buildPayload: () =>
          Promise.resolve({
            payload: {
              skills: [
                {
                  description: "Selected skill",
                  directoryPath: "skills/selected/",
                  entryPath: "skills/selected/skill.md",
                  initialSnapshot: {
                    files: [{ content: "selected", path: "skills/selected/skill.md" }],
                    sourceCommitDate: 1,
                    sourceCommitSha: "sha-selected",
                    sourceRef: "main",
                    tree: [{ path: "skills/selected/skill.md", sha: "sha-selected", type: "blob" }],
                  },
                  slug: "selected",
                  sourceLocator: "github:example/skills/skills/selected/skill.md",
                  sourceType: "github",
                  title: "Selected",
                },
                {
                  description: "Ignored skill",
                  directoryPath: "skills/ignored/",
                  entryPath: "skills/ignored/skill.md",
                  initialSnapshot: {
                    files: [{ content: "ignored", path: "skills/ignored/skill.md" }],
                    sourceCommitDate: 1,
                    sourceCommitSha: "sha-ignored",
                    sourceRef: "main",
                    tree: [{ path: "skills/ignored/skill.md", sha: "sha-ignored", type: "blob" }],
                  },
                  slug: "ignored",
                  sourceLocator: "github:example/skills/skills/ignored/skill.md",
                  sourceType: "github",
                  title: "Ignored",
                },
              ],
            },
          }),
      },
      {
        enqueue: (input) => {
          scheduledPayloads.push(input);
          return Promise.resolve({ workId: "workflow-selected" });
        },
      },
    );

    expect(result).toEqual({
      skillsCount: 1,
      status: "submitted",
      workflowId: "workflow-selected",
    });
    expect(scheduledPayloads).toHaveLength(1);
    expect(scheduledPayloads[0]?.skills.map((skill) => skill.slug)).toEqual(["selected"]);
  });

  test("submits a prepared public github payload without rebuilding the repo payload", async () => {
    const scheduledPayloads: SkillsUploadContentPayload[] = [];

    const result = await submitGithubPreparedPublic(
      {
        recentCommits: [{ sha: "abc123" }],
        repo: {
          createdAt: 1,
          defaultBranch: "main",
          forks: 2,
          license: "MIT",
          nameWithOwner: "example/skills",
          owner: {
            handle: "example",
          },
          stars: 3,
          updatedAt: 4,
        },
        skills: [
          {
            description: "Prepared skill",
            directoryPath: "skills/prepared/",
            entryPath: "skills/prepared/SKILL.md",
            frontmatterHash: "frontmatter-hash",
            initialSnapshot: {
              files: [{ content: "prepared", path: "SKILL.md" }],
              sourceCommitDate: 1,
              sourceCommitSha: "abc123",
              sourceRef: "main",
              tree: [{ path: "SKILL.md", sha: "abc123", type: "blob" }],
            },
            skillContentHash: "content-hash",
            slug: "prepared-skill",
            sourceLocator: "github:example/skills/skills/prepared/SKILL.md",
            sourceType: "github",
            title: "Prepared skill",
          },
        ],
      },
      {
        enqueue: (input) => {
          scheduledPayloads.push(input);
          return Promise.resolve({ workId: "workflow-prepared" });
        },
      },
      () => Promise.resolve(null),
    );

    expect(result).toEqual({
      skillsCount: 1,
      status: "submitted",
      workflowId: "workflow-prepared",
    });
    expect(scheduledPayloads).toHaveLength(1);
    expect(scheduledPayloads[0]?.skills.map((skill) => skill.slug)).toEqual(["prepared-skill"]);
  });

  test("returns snapshot history info for the requested skills", async () => {
    const calls: string[][] = [];
    const service = createSkillsService({
      listSkillsHistoryInfoByIds: (skillIds) => {
        calls.push(skillIds);
        return Promise.resolve([
          {
            directoryPath: "skills/example",
            entryPath: "skill.md",
            id: "skill-1",
            latestDescription: "Example skill",
            latestName: "Example",
            latestVersion: "1.0.0",
          },
        ]);
      },
    });

    await expect(service.getSkillsHistoryInfo({ skillIds: ["skill-1"] })).resolves.toEqual([
      {
        directoryPath: "skills/example",
        entryPath: "skill.md",
        id: "skill-1",
        latestDescription: "Example skill",
        latestName: "Example",
        latestVersion: "1.0.0",
      },
    ]);

    expect(calls).toEqual([["skill-1"]]);
  });

  test("normalizes nullable snapshot versions when returning history info", async () => {
    const service = createSkillsService({
      listSkillsHistoryInfoByIds: () =>
        Promise.resolve([
          {
            directoryPath: "skills/example",
            entryPath: "skill.md",
            id: "skill-1",
            latestDescription: "Example skill",
            latestName: "Example",
            latestVersion: null,
          },
        ]),
    });

    await expect(service.getSkillsHistoryInfo({ skillIds: ["skill-1"] })).resolves.toEqual([
      {
        directoryPath: "skills/example",
        entryPath: "skill.md",
        id: "skill-1",
        latestDescription: "Example skill",
        latestName: "Example",
        latestVersion: undefined,
      },
    ]);
  });
});
