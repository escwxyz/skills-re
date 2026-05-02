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
});
