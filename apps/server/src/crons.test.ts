/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  DAILY_METRICS_REFRESH_CRON,
  REPO_SKILLS_DISCOVERY_CRON,
  REPO_STATS_SYNC_CRON,
  enqueueScheduledRepoSkillsDiscovery,
  runScheduledJobs,
} from "./crons";

const createExecutionContextStub = () => {
  const scheduled: Promise<unknown>[] = [];
  const context = {
    passThroughOnException() {},
    props: {},
    waitUntil(promise: Promise<unknown>) {
      scheduled.push(promise);
    },
  } satisfies ExecutionContext;

  return {
    context,
    scheduled,
  };
};

describe("runScheduledJobs", () => {
  test("enqueues repo stats sync on the stats cron", async () => {
    const enqueued: unknown[] = [];
    const { context, scheduled } = createExecutionContextStub();

    runScheduledJobs({ cron: REPO_STATS_SYNC_CRON } as ScheduledController, {} as Env, context, {
      getRepoStatsSyncWorkflowScheduler: () => ({
        enqueue(input) {
          enqueued.push(input);
          return Promise.resolve({ workId: "stats-1" });
        },
      }),
    });

    expect(scheduled).toHaveLength(1);
    await Promise.all(scheduled);

    expect(enqueued).toEqual([
      {
        limit: 20,
        maxPages: 5,
        runAfterMs: 0,
      },
    ]);
  });

  test("enqueues repo skills discovery for each repo page on the discovery cron", async () => {
    const enqueued: unknown[] = [];

    await enqueueScheduledRepoSkillsDiscovery(
      { REPO_SKILLS_DISCOVERY_MAX_PAGES: "2" } as unknown as Env,
      {
        getRepoSkillsDiscoveryWorkflowScheduler: () => ({
          enqueue(input) {
            enqueued.push(input);
            return Promise.resolve({ workId: `discovery-${enqueued.length}` });
          },
        }),
        listReposPage: async (input) => {
          if (!input?.cursor) {
            return {
              continueCursor: "cursor-2",
              isDone: false,
              repos: [
                {
                  nameWithOwner: "acme/skills",
                  repoName: "skills",
                  repoOwner: "acme",
                  skillCount: 2,
                },
              ],
            };
          }

          return {
            continueCursor: "",
            isDone: true,
            repos: [
              {
                nameWithOwner: "openai/codex-skills",
                repoName: "codex-skills",
                repoOwner: "openai",
                skillCount: 3,
              },
            ],
          };
        },
      },
    );

    expect(enqueued).toEqual([
      {
        repoName: "skills",
        repoOwner: "acme",
      },
      {
        repoName: "codex-skills",
        repoOwner: "openai",
      },
    ]);
  });

  test("keeps the scheduled invocation to one discovery sweep queue send", async () => {
    const sweeps: unknown[] = [];
    const { context, scheduled } = createExecutionContextStub();

    runScheduledJobs(
      { cron: REPO_SKILLS_DISCOVERY_CRON } as ScheduledController,
      {} as Env,
      context,
      {
        getRepoSkillsDiscoverySweepScheduler: () => ({
          enqueue(input: unknown) {
            sweeps.push(input);
            return Promise.resolve({ workId: "sweep-1" });
          },
        }),
        listReposPage: () => Promise.reject(new Error("cron must not page repositories")),
      },
    );

    await Promise.all(scheduled);

    expect(sweeps).toEqual([
      {
        limit: 20,
        maxPages: 1,
      },
    ]);
  });

  test("bounds repo skills discovery and enqueues the next cursor", async () => {
    const enqueued: unknown[] = [];
    const continuations: unknown[] = [];
    const requestedCursors: (string | undefined)[] = [];

    await enqueueScheduledRepoSkillsDiscovery(
      { REPO_SKILLS_DISCOVERY_MAX_PAGES: "1" } as unknown as Env,
      {
        getRepoSkillsDiscoverySweepScheduler: () => ({
          enqueue(input: unknown) {
            continuations.push(input);
            return Promise.resolve({ workId: "sweep-2" });
          },
        }),
        getRepoSkillsDiscoveryWorkflowScheduler: () => ({
          enqueue(input) {
            enqueued.push(input);
            return Promise.resolve({ workId: `discovery-${enqueued.length}` });
          },
        }),
        listReposPage: async (input) => {
          requestedCursors.push(input?.cursor);
          const pageNumber = requestedCursors.length;
          return {
            continueCursor: pageNumber < 3 ? `cursor-${pageNumber + 1}` : "",
            isDone: pageNumber === 3,
            repos: [
              {
                nameWithOwner: `acme/skills-${pageNumber}`,
                repoName: `skills-${pageNumber}`,
                repoOwner: "acme",
                skillCount: 1,
              },
            ],
          };
        },
      },
    );

    expect(requestedCursors).toEqual([undefined]);
    expect(enqueued).toHaveLength(1);
    expect(continuations).toEqual([
      {
        cursor: "cursor-2",
        limit: 20,
        maxPages: 1,
      },
    ]);
  });

  test("propagates scheduled job failures so Cloudflare can retry", async () => {
    const { context, scheduled } = createExecutionContextStub();

    runScheduledJobs({ cron: REPO_STATS_SYNC_CRON } as ScheduledController, {} as Env, context, {
      getRepoStatsSyncWorkflowScheduler: () => ({
        enqueue() {
          return Promise.reject(new Error("queue unavailable"));
        },
      }),
    });

    expect(scheduled).toHaveLength(1);
    await expect(scheduled[0]).rejects.toThrow("queue unavailable");
  });

  test("refreshes daily metrics on the metrics cron", async () => {
    const refreshed: unknown[] = [];
    const { context, scheduled } = createExecutionContextStub();

    runScheduledJobs(
      { cron: DAILY_METRICS_REFRESH_CRON } as ScheduledController,
      {} as Env,
      context,
      {
        refreshDailySkillsSnapshots: async (input) => {
          refreshed.push(input);
          return { days: 7, fromDay: "2026-05-09", toDay: "2026-05-15", updatedAtMs: 0 };
        },
      },
    );

    expect(scheduled).toHaveLength(1);
    await Promise.all(scheduled);

    expect(refreshed).toHaveLength(1);
  });

  test("ignores unmatched cron expressions", () => {
    const { context, scheduled } = createExecutionContextStub();

    runScheduledJobs({ cron: "30 1 * * *" } as ScheduledController, {} as Env, context, {});

    expect(scheduled).toHaveLength(0);
  });
});
