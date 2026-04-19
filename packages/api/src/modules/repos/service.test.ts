/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { encodeRepoCursor } from "./cursor";
import { createReposService } from "./service";

describe("repos service", () => {
  test("returns null when syncing stats for an empty repo page", async () => {
    const service = createReposService({
      githubConfigured: () => true,
      listReposPageBySyncTime: async () => ({
        continueCursor: "",
        isDone: true,
        repos: [],
      }),
    });

    await expect(service.syncStats()).resolves.toBeNull();
  });

  test("maps listPage cursors and repo fields using the contract shape", async () => {
    const calls: { cursor?: string; limit?: number }[] = [];
    const service = createReposService({
      listReposPageBySyncTime: async (input) => {
        calls.push({
          cursor: input?.cursor,
          limit: input?.limit,
        });

        return {
          continueCursor: encodeRepoCursor({
            id: "repo-2",
            syncTime: 456,
          }),
          isDone: false,
          repos: [
            {
              nameWithOwner: "acme/widget",
              repoName: "widget",
              repoOwner: "acme",
            },
          ],
        };
      },
    });

    await expect(
      service.listPage({
        cursor: encodeRepoCursor({
          id: "repo-1",
          syncTime: 123,
        }),
        limit: 10,
      }),
    ).resolves.toEqual({
      continueCursor: encodeRepoCursor({
        id: "repo-2",
        syncTime: 456,
      }),
      isDone: false,
      repos: [
        {
          nameWithOwner: "acme/widget",
          repoName: "widget",
          repoOwner: "acme",
        },
      ],
    });

    expect(calls).toEqual([
      {
        cursor: encodeRepoCursor({
          id: "repo-1",
          syncTime: 123,
        }),
        limit: 10,
      },
    ]);
  });

  test("updates repo stats and records changed repos when syncing stats", async () => {
    const fetched: { name: string; owner: string }[] = [];
    const updated: { nameWithOwner: string; forks: number; stars: number; updatedAt: number }[] =
      [];

    const service = createReposService({
      fetchRepoStats: async (_query, variables) => {
        fetched.push(variables);
        return {
          repository: {
            forkCount: 4,
            nameWithOwner: "acme/widget",
            stargazerCount: 12,
            updatedAt: "2026-04-18T12:00:00.000Z",
          },
        };
      },
      githubConfigured: () => true,
      listReposPageBySyncTime: async () => ({
        continueCursor: encodeRepoCursor({
          id: "repo-2",
          syncTime: 456,
        }),
        isDone: false,
        repos: [
          {
            nameWithOwner: "acme/widget",
            repoName: "widget",
            repoOwner: "acme",
          },
        ],
      }),
      updateRepoStatsByNameWithOwner: async (input) => {
        updated.push(input);
        return { changed: true };
      },
    });

    await expect(service.syncStats()).resolves.toEqual({
      changed: [
        {
          repoName: "widget",
          repoOwner: "acme",
          updatedAt: Date.parse("2026-04-18T12:00:00.000Z"),
        },
      ],
      continueCursor: encodeRepoCursor({
        id: "repo-2",
        syncTime: 456,
      }),
      isDone: false,
    });
    expect(fetched).toEqual([{ name: "widget", owner: "acme" }]);
    expect(updated).toEqual([
      {
        forks: 4,
        nameWithOwner: "acme/widget",
        stars: 12,
        updatedAt: Date.parse("2026-04-18T12:00:00.000Z"),
      },
    ]);
  });

  test("throws when syncing stats without GitHub credentials", async () => {
    const service = createReposService({
      githubConfigured: () => false,
    });

    await expect(service.syncStats()).rejects.toThrow("GitHub token is not configured.");
  });

  test("enqueues repo stats sync with the default scheduler input", async () => {
    const enqueued: { limit: number; runAfterMs: number }[] = [];
    const service = createReposService();

    const result = await service.enqueueStatsSync(
      {
        enqueue: async (input) => {
          enqueued.push({
            limit: input.limit ?? 20,
            runAfterMs: input.runAfterMs ?? 0,
          });
          return { workId: "work_123" };
        },
      },
    );

    expect(result).toEqual({ workId: "work_123" });
    expect(enqueued).toEqual([{ limit: 20, runAfterMs: 0 }]);
  });

  test("delegates repo stat updates to the repository updater", async () => {
    const calls: {
      forks: number;
      nameWithOwner: string;
      stars: number;
      updatedAt: number;
    }[] = [];
    const service = createReposService({
      updateRepoStatsByNameWithOwner: async (input) => {
        calls.push(input);
        return { changed: true };
      },
    });

    await expect(
      service.updateStats({
        forks: 7,
        nameWithOwner: "acme/widget",
        stars: 21,
        updatedAt: 123,
      }),
    ).resolves.toEqual({ changed: true });
    expect(calls).toEqual([
      {
        forks: 7,
        nameWithOwner: "acme/widget",
        stars: 21,
        updatedAt: 123,
      },
    ]);
  });

  test("returns a repo by id through getById", async () => {
    const service = createReposService({
      findRepoById: async (id) =>
        id === "repo-1"
          ? {
              forks: 4,
              id,
              name: "widget",
              nameWithOwner: "acme/widget",
              ownerAvatarUrl: null,
              ownerHandle: "acme",
              ownerName: "Acme",
              stars: 12,
              updatedAt: 456,
            }
          : null,
    });

    await expect(service.getById("repo-1")).resolves.toEqual({
      forks: 4,
      id: "repo-1",
      name: "widget",
      nameWithOwner: "acme/widget",
      ownerAvatarUrl: null,
      ownerHandle: "acme",
      ownerName: "Acme",
      stars: 12,
      updatedAt: 456,
    });
  });

  test("reuses an existing repo in ensureRepo", async () => {
    const service = createReposService({
      findRepoByNameWithOwner: async (nameWithOwner) =>
        nameWithOwner === "acme/widget"
          ? {
              id: "repo-9",
            }
          : null,
      createRepo: async () => {
        throw new Error("should not create a repo when one already exists");
      },
    });

    await expect(
      service.ensureRepo({
        createdAt: 100,
        defaultBranch: "main",
        forks: 1,
        nameWithOwner: "acme/widget",
        owner: {
          handle: "acme",
          name: "Acme",
          avatarUrl: null,
        },
        stars: 2,
        updatedAt: 200,
      }),
    ).resolves.toEqual("repo-9");
  });

  test("creates a repo when ensureRepo cannot find one", async () => {
    const calls: {
      createdAt: number;
      defaultBranch: string;
      forks: number;
      license?: string | null;
      name: string;
      nameWithOwner: string;
      ownerAvatarUrl?: string | null;
      ownerHandle: string;
      ownerName?: string | null;
      stars: number;
      syncTime: number;
      updatedAt: number;
      url: string;
    }[] = [];

    const service = createReposService({
      createRepo: async (input) => {
        calls.push(input);
        return "repo-10";
      },
      findRepoByNameWithOwner: async () => null,
    });

    await expect(
      service.ensureRepo({
        createdAt: 100,
        defaultBranch: "main",
        forks: 1,
        license: "MIT",
        nameWithOwner: "acme/widget",
        owner: {
          handle: "acme",
          name: null,
          avatarUrl: "https://example.com/avatar.png",
        },
        stars: 2,
        updatedAt: 200,
      }),
    ).resolves.toEqual("repo-10");

    expect(calls).toHaveLength(1);
    const createdRepo = calls[0]!;
    expect(createdRepo).toMatchObject({
      createdAt: 100,
      defaultBranch: "main",
      forks: 1,
      license: "MIT",
      name: "widget",
      nameWithOwner: "acme/widget",
      ownerAvatarUrl: "https://example.com/avatar.png",
      ownerHandle: "acme",
      ownerName: null,
      stars: 2,
      updatedAt: 200,
      url: "https://github.com/acme/widget",
    });
    expect(typeof createdRepo.syncTime).toBe("number");
  });

  test("skips repo snapshot sync when the repo does not exist", async () => {
    const service = createReposService({
      githubConfigured: () => true,
      findRepoByNameWithOwner: async () => null,
    });

    await expect(
      service.syncRepoSnapshots({
        repoName: "widget",
        repoOwner: "acme",
      }),
    ).resolves.toEqual({
      checkedSkills: 0,
      createdSnapshots: 0,
      reason: "repo-not-found",
      status: "skipped",
    });
  });

  test("syncs repo snapshots through the snapshot pipeline", async () => {
    const createSnapshotCalls: {
      description: string;
      directoryPath: string;
      entryPath: string;
      hash: string;
      name: string;
      skillId: string;
      sourceCommitDate?: number;
      sourceCommitMessage?: string | null;
      sourceCommitSha: string;
      sourceCommitUrl?: string | null;
      syncTime: number;
      version: string;
    }[] = [];
    const uploaded: { files: { content: string; path: string }[]; snapshotId: string }[] = [];
    const fetchedRoots: string[] = [];
    const latestUpdates: {
      latestCommitDate?: number | null;
      latestCommitMessage?: string | null;
      latestCommitSha?: string | null;
      latestCommitUrl?: string | null;
      skillId: string;
      snapshotId: string;
      syncTime?: number;
    }[] = [];
    const deprecated: { keepLatest: number; skillId: string }[] = [];

    const service = createReposService({
      createSnapshot: async (input) => {
        createSnapshotCalls.push(input);
        return "snapshot-1";
      },
      deprecateSnapshotsBeyondLimit: async (input) => {
        deprecated.push(input);
      },
      fetchRepoOverview: async () => ({
        commits: [
          {
            committedDate: "2026-04-18T12:00:00.000Z",
            message: "feat: refresh widget",
            sha: "sha-1",
            url: "https://github.com/acme/widget/commit/sha-1",
          },
        ],
        headSha: "sha-1",
      }),
      fetchSkillFilesForRoot: async (input) => {
        fetchedRoots.push(input.skillRootPath);
        return {
          files: [
            {
              content: "---\nname: widget\n---\n# widget\n",
              path: `${input.skillRootPath}/skill.md`,
            },
          ],
        };
      },
      fetchTree: async () => [
        {
          path: "custom/boards/widget/skill.md",
          sha: "blob-1",
          type: "blob",
        },
      ],
      findRepoByNameWithOwner: async () => ({
        id: "repo-1",
        updatedAt: 200,
      }),
      githubConfigured: () => true,
      listRepoSkillSnapshotHeadsByRepoId: async () => [
        {
          directoryPath: "custom/boards/widget/",
          entryPath: "custom/boards/widget/skill.md",
          latestDescription: "Widget skill snapshot",
          latestHash: "old-hash",
          latestName: "widget",
          latestSnapshotId: "snapshot-old",
          latestSourceCommitSha: null,
          latestVersion: "1.2.3",
          skillId: "skill-1",
          slug: "widget",
        },
      ],
      setSkillLatestSnapshot: async (input) => {
        latestUpdates.push(input);
      },
      uploadSnapshotFiles: async (input) => {
        uploaded.push(input);
        return { workId: "work-1" };
      },
    });

    await expect(
      service.syncRepoSnapshots({
        repoName: "widget",
        repoOwner: "acme",
        expectedUpdatedAt: 300,
      }),
    ).resolves.toEqual({
      checkedSkills: 1,
      createdSnapshots: 1,
      headSha: "sha-1",
      missingSkillFiles: 0,
      status: "completed",
      unchangedByCommit: 0,
      unchangedByHash: 0,
    });

    expect(createSnapshotCalls).toHaveLength(1);
    expect(createSnapshotCalls[0]).toMatchObject({
      description: "Widget skill snapshot",
      directoryPath: "custom/boards/widget/",
      entryPath: "custom/boards/widget/skill.md",
      name: "widget",
      skillId: "skill-1",
      sourceCommitDate: Date.parse("2026-04-18T12:00:00.000Z"),
      sourceCommitMessage: "feat: refresh widget",
      sourceCommitSha: "sha-1",
      sourceCommitUrl: "https://github.com/acme/widget/commit/sha-1",
      version: "1.2.4",
    });
    expect(typeof createSnapshotCalls[0]?.hash).toBe("string");
    expect(uploaded).toEqual([
      {
        files: [
          {
            content: "---\nname: widget\n---\n# widget\n",
            path: "custom/boards/widget/skill.md",
          },
        ],
        snapshotId: "snapshot-1",
      },
    ]);
    expect(fetchedRoots).toEqual(["custom/boards/widget"]);
    expect(latestUpdates).toEqual([
      {
        latestCommitDate: Date.parse("2026-04-18T12:00:00.000Z"),
        latestCommitMessage: "feat: refresh widget",
        latestCommitSha: "sha-1",
        latestCommitUrl: "https://github.com/acme/widget/commit/sha-1",
        skillId: "skill-1",
        snapshotId: "snapshot-1",
        syncTime: undefined,
      },
    ]);
    expect(deprecated).toEqual([
      {
        keepLatest: 3,
        skillId: "skill-1",
      },
    ]);
  });
});
