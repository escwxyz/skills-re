/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { reposService } from "@skills-re/api/modules/repos/service";

import { getRepoStatsSyncWorkflowScheduler } from "./repo-stats";

describe("getRepoStatsSyncWorkflowScheduler", () => {
  test("waits for local work to finish before resolving", async () => {
    const originalConsoleError = console.error;
    const logs: unknown[] = [];
    console.error = (...args: unknown[]) => {
      logs.push(args[0]);
    };

    const originalSyncStats = reposService.syncStats;
    let settled = false;
    const syncStatsPromise =
      Promise.withResolvers<Awaited<ReturnType<typeof reposService.syncStats>>>();
    reposService.syncStats = (() => syncStatsPromise.promise) as typeof reposService.syncStats;

    try {
      const scheduler = getRepoStatsSyncWorkflowScheduler({} as never);
      const enqueuePromise = scheduler
        .enqueue({
          cursor: "cursor-1",
          limit: 1,
        })
        .then((value) => {
          settled = true;
          return value;
        });

      await Promise.resolve();
      expect(settled).toBe(false);

      syncStatsPromise.resolve({
        changed: [],
        continueCursor: "",
        isDone: true,
      });

      await expect(enqueuePromise).resolves.toEqual({ workId: expect.stringMatching(/^local-/) });

      await Promise.resolve();
      await Promise.resolve();
      expect(settled).toBe(true);
      expect(logs).toHaveLength(0);
    } finally {
      reposService.syncStats = originalSyncStats;
      console.error = originalConsoleError;
    }
  });

  test("logs local scheduler failures with structured errors", async () => {
    const originalConsoleError = console.error;
    const logs: unknown[] = [];
    console.error = (...args: unknown[]) => {
      logs.push(args[0]);
    };

    const originalSyncStats = reposService.syncStats;
    reposService.syncStats = () => {
      throw new Error("boom");
    };

    try {
      const scheduler = getRepoStatsSyncWorkflowScheduler({} as never);
      await expect(
        scheduler.enqueue({
          cursor: "cursor-1",
          limit: 1,
        }),
      ).resolves.toEqual({ workId: expect.stringMatching(/^local-/) });

      await Promise.resolve();
      await Promise.resolve();
    } finally {
      reposService.syncStats = originalSyncStats;
      console.error = originalConsoleError;
    }

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      component: "repo-stats.local-scheduler",
      error: {
        message: "boom",
        name: "Error",
      },
      event: "repo-stats.local-scheduler.failed",
      level: "error",
      workId: expect.stringMatching(/^local-/),
    });
  });

  test("syncs stats locally through the GitHub stats runtime", async () => {
    const originalFetch = globalThis.fetch;
    const originalGhPat = process.env.GH_PAT;
    const originalListPage = reposService.listPage;
    const originalUpdateStats = reposService.updateStats;
    const fetched: { name: string; owner: string }[] = [];
    const updates: {
      forks: number;
      nameWithOwner: string;
      stars: number;
      updatedAt: number;
    }[] = [];

    process.env.GH_PAT = "token";
    reposService.listPage = async () => ({
      continueCursor: "",
      isDone: true,
      repos: [
        {
          nameWithOwner: "acme/widget",
          repoName: "widget",
          repoOwner: "acme",
          skillCount: 1,
        },
      ],
    });
    reposService.updateStats = async (input) => {
      updates.push(input);
      return { changed: true };
    };
    const fetchMock = async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const body = JSON.parse((init?.body ?? "{}") as string) as {
        query: string;
        variables: { name: string; owner: string };
      };
      fetched.push({
        name: body.variables.name,
        owner: body.variables.owner,
      });
      expect(input).toBe("https://api.github.com/graphql");
      expect(init?.method).toBe("POST");
      expect(body.query).toContain("GetRepoStats");
      return new Response(
        JSON.stringify({
          data: {
            repository: {
              forkCount: 4,
              nameWithOwner: "acme/widget",
              stargazerCount: 12,
              updatedAt: "2026-04-18T12:00:00.000Z",
            },
          },
        }),
        {
          headers: {
            "content-type": "application/json",
          },
          status: 200,
        },
      );
    };
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const scheduler = getRepoStatsSyncWorkflowScheduler({
        GH_PAT: "token",
      } as never);

      await expect(
        scheduler.enqueue({
          limit: 1,
        }),
      ).resolves.toEqual({ workId: expect.stringMatching(/^local-/) });
    } finally {
      globalThis.fetch = originalFetch;
      process.env.GH_PAT = originalGhPat;
      reposService.listPage = originalListPage;
      reposService.updateStats = originalUpdateStats;
    }

    expect(fetched).toEqual([{ name: "widget", owner: "acme" }]);
    expect(updates).toEqual([
      {
        forks: 4,
        nameWithOwner: "acme/widget",
        stars: 12,
        updatedAt: Date.parse("2026-04-18T12:00:00.000Z"),
      },
    ]);
  });
});
