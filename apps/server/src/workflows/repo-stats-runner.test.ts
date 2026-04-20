/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { RepoStatsSyncSchedulerInput } from "@skills-re/api/modules/repos/service";
import type { RepoSnapshotSyncScheduler } from "@skills-re/api/types";

import { runRepoStatsSyncWorkflow } from "./repo-stats-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runRepoStatsSyncWorkflow", () => {
  test("schedules repo snapshot sync for changed repos", async () => {
    const syncStatsCalls: RepoStatsSyncSchedulerInput[] = [];
    const snapshotSyncCalls: Parameters<RepoSnapshotSyncScheduler["enqueue"]>[0][] = [];

    const result = await runRepoStatsSyncWorkflow(
      {
        payload: {
          cursor: "cursor-1",
          limit: 5,
        },
      } as never,
      createWorkflowStepStub() as never,
      {
        syncStats: (input) => {
          syncStatsCalls.push(input ?? {});
          return Promise.resolve({
            changed: [
              {
                repoName: "skills",
                repoOwner: "acme",
                updatedAt: 123,
              },
            ],
            continueCursor: "cursor-2",
            isDone: true,
          });
        },
        snapshotSyncScheduler: {
          enqueue: (input) => {
            snapshotSyncCalls.push({ ...input });
            return Promise.resolve({ workId: "snapshot-sync-1" });
          },
        },
      },
    );

    expect(syncStatsCalls).toEqual([{ cursor: "cursor-1", limit: 5 }]);
    expect(snapshotSyncCalls).toEqual([
      {
        expectedUpdatedAt: 123,
        repoName: "skills",
        repoOwner: "acme",
      },
    ]);
    expect(result).toEqual({
      changedCount: 1,
      continueCursor: "",
      processedPages: 1,
      scheduledSnapshotSyncCount: 1,
      status: "completed",
    });
  });
});
