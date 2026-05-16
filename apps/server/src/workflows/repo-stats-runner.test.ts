/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { RepoStatsSyncSchedulerInput } from "@skills-re/api/modules/repos/service";
import { runRepoStatsSyncWorkflow } from "./repo-stats-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runRepoStatsSyncWorkflow", () => {
  test("syncs repository metadata without scheduling skill snapshot sync", async () => {
    const syncStatsCalls: RepoStatsSyncSchedulerInput[] = [];

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
      },
    );

    expect(syncStatsCalls).toEqual([{ cursor: "cursor-1", limit: 5 }]);
    expect(result).toEqual({
      changedCount: 1,
      continueCursor: "",
      processedPages: 1,
      status: "completed",
    });
  });

  test("returns a continuation cursor without scheduling content sync work", async () => {
    const result = await runRepoStatsSyncWorkflow(
      {
        payload: {
          limit: 1,
        },
      } as never,
      createWorkflowStepStub() as never,
      {
        syncStats: () =>
          Promise.resolve({
            changed: [
              {
                repoName: "skills",
                repoOwner: "acme",
                updatedAt: 123,
              },
            ],
            continueCursor: "cursor-next",
            isDone: false,
          }),
      },
    );

    expect(result).toEqual({
      changedCount: 25,
      continueCursor: "cursor-next",
      processedPages: 25,
      status: "partial",
    });
  });
});
