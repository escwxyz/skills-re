/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { RepoStatsSyncSchedulerInput } from "@skills-re/api/modules/repos/service";
import { runRepoStatsSyncWorkflow } from "./repo-stats-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runRepoStatsSyncWorkflow", () => {
  test("syncs repository metadata and schedules content sync for changed repos", async () => {
    const syncStatsCalls: RepoStatsSyncSchedulerInput[] = [];
    const discoveryCalls: { expectedUpdatedAt?: number; repoName: string; repoOwner: string }[] =
      [];

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
        skillsDiscoveryScheduler: {
          enqueue: (input) => {
            discoveryCalls.push(input);
            return Promise.resolve({ workId: "work-1" });
          },
        },
      },
    );

    expect(syncStatsCalls).toEqual([{ cursor: "cursor-1", limit: 5 }]);
    expect(discoveryCalls).toEqual([
      { expectedUpdatedAt: 123, repoName: "skills", repoOwner: "acme" },
    ]);
    expect(result).toEqual({
      changedCount: 1,
      continueCursor: "",
      processedPages: 1,
      status: "completed",
    });
  });

  test("returns a continuation cursor and schedules content sync for all accumulated changed repos", async () => {
    const discoveryCalls: { expectedUpdatedAt?: number; repoName: string; repoOwner: string }[] =
      [];

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
        skillsDiscoveryScheduler: {
          enqueue: (input) => {
            discoveryCalls.push(input);
            return Promise.resolve({ workId: "work-1" });
          },
        },
      },
    );

    expect(discoveryCalls).toHaveLength(5);
    expect(discoveryCalls[0]).toEqual({
      expectedUpdatedAt: 123,
      repoName: "skills",
      repoOwner: "acme",
    });
    expect(result).toEqual({
      changedCount: 5,
      continueCursor: "cursor-next",
      processedPages: 5,
      status: "partial",
    });
  });

  test("enqueues a continuation when the workflow reaches its page limit", async () => {
    const continuations: RepoStatsSyncSchedulerInput[] = [];

    const result = await runRepoStatsSyncWorkflow(
      {
        payload: {
          limit: 1,
          maxPages: 1,
        },
      } as never,
      createWorkflowStepStub() as never,
      {
        continuationScheduler: {
          enqueue(input) {
            continuations.push(input);
            return Promise.resolve({ workId: "continuation-1" });
          },
        },
        syncStats: () =>
          Promise.resolve({
            changed: [],
            continueCursor: "cursor-2",
            isDone: false,
          }),
      },
    );

    expect(result.status).toBe("partial");
    expect(continuations).toEqual([
      {
        cursor: "cursor-2",
        limit: 1,
        maxPages: 1,
      },
    ]);
  });

  test("does not schedule content sync for metadata-only repo refreshes", async () => {
    const discoveryCalls: { expectedUpdatedAt?: number; repoName: string; repoOwner: string }[] =
      [];

    const result = await runRepoStatsSyncWorkflow(
      {
        payload: {
          limit: 5,
        },
      } as never,
      createWorkflowStepStub() as never,
      {
        syncStats: () =>
          Promise.resolve({
            changed: [],
            continueCursor: "",
            isDone: true,
            metadataChanged: [
              {
                repoName: "skills",
                repoOwner: "acme",
              },
            ],
          }),
        skillsDiscoveryScheduler: {
          enqueue: (input) => {
            discoveryCalls.push(input);
            return Promise.resolve({ workId: "work-1" });
          },
        },
      },
    );

    expect(discoveryCalls).toEqual([]);
    expect(result).toEqual({
      changedCount: 0,
      continueCursor: "",
      processedPages: 1,
      status: "completed",
    });
  });
});
