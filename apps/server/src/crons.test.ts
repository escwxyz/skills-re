/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  DAILY_METRICS_REFRESH_CRON,
  REPO_SKILLS_DISCOVERY_CRON,
  REPO_STATS_SYNC_CRON,
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
    const { context, scheduled } = createExecutionContextStub();

    runScheduledJobs(
      { cron: REPO_SKILLS_DISCOVERY_CRON } as ScheduledController,
      {} as Env,
      context,
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

    expect(scheduled).toHaveLength(1);
    await Promise.all(scheduled);

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
