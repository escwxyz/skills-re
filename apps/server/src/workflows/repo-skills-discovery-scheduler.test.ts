/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  getRepoSkillsDiscoveryWorkflowScheduler,
  getRepoSkillImportWorkflowQueueScheduler,
  getRepoSkillSnapshotSyncWorkflowQueueScheduler,
} from "./repo-skills-discovery-scheduler";

describe("repo skill fan-out queue schedulers", () => {
  test("reserves a rate-limited slot for discovery queue messages when a limiter is configured", async () => {
    const messages: unknown[] = [];
    const requests: { dailyLimit?: number; spacingMs?: number; units?: number }[] = [];
    const env = {
      AI_WORKFLOW_RATE_LIMITER: {
        get() {
          return {
            fetch: async (request: Request) => {
              requests.push((await request.json()) as (typeof requests)[number]);
              return Response.json({
                delaySeconds: 17,
                notBeforeMs: 1_700_000_000_000,
              });
            },
          };
        },
        idFromName(name: string) {
          return name;
        },
      },
      REPO_SKILLS_DISCOVERY_WORKFLOW_DAILY_LIMIT: "25",
      REPO_SKILLS_DISCOVERY_WORKFLOW_SPACING_SECONDS: "90",
      REPO_SKILLS_DISCOVERY_WORKFLOW_QUEUE: {
        send(message: unknown) {
          messages.push(message);
          return Promise.resolve();
        },
      },
    };

    const scheduler = getRepoSkillsDiscoveryWorkflowScheduler(env as never);

    await expect(
      scheduler?.enqueue({
        repoName: "skills",
        repoOwner: "acme",
      }),
    ).resolves.toEqual({ workId: expect.stringMatching(/^repo-skills-discovery-/) });

    expect(requests).toEqual([
      {
        dailyLimit: 25,
        spacingMs: 90_000,
        units: 1,
      },
    ]);
    expect(messages).toEqual([
      {
        kind: "repo-skills-discovery",
        notBeforeMs: 1_700_000_000_000,
        payload: {
          repoName: "skills",
          repoOwner: "acme",
        },
        workflowId: expect.stringMatching(/^repo-skills-discovery-/),
      },
    ]);
  });

  test("enqueue import and snapshot jobs through queue messages", async () => {
    const messages: unknown[] = [];
    const env = {
      REPO_SKILL_IMPORT_WORKFLOW_QUEUE: {
        send(message: unknown) {
          messages.push(message);
          return Promise.resolve();
        },
      },
      REPO_SKILL_SNAPSHOT_SYNC_WORKFLOW_QUEUE: {
        send(message: unknown) {
          messages.push(message);
          return Promise.resolve();
        },
      },
    };

    const importScheduler = getRepoSkillImportWorkflowQueueScheduler(env as never);
    const snapshotScheduler = getRepoSkillSnapshotSyncWorkflowQueueScheduler(env as never);

    await expect(
      importScheduler?.enqueue({
        repoName: "skills",
        repoOwner: "acme",
        skillRootPath: "skills/new",
      }),
    ).resolves.toEqual({ workId: expect.stringMatching(/^repo-skill-import-/) });
    await expect(
      snapshotScheduler?.enqueue({
        expectedHeadSha: "head-sha",
        repoName: "skills",
        repoOwner: "acme",
        skillId: "skill-1",
        skillRootPath: "skills/existing",
      }),
    ).resolves.toEqual({ workId: expect.stringMatching(/^repo-skill-snapshot-sync-/) });

    expect(messages).toEqual([
      {
        kind: "repo-skill-import",
        payload: {
          repoName: "skills",
          repoOwner: "acme",
          skillRootPath: "skills/new",
        },
        workflowId: expect.stringMatching(/^repo-skill-import-/),
      },
      {
        kind: "repo-skill-snapshot-sync",
        payload: {
          expectedHeadSha: "head-sha",
          repoName: "skills",
          repoOwner: "acme",
          skillId: "skill-1",
          skillRootPath: "skills/existing",
        },
        workflowId: expect.stringMatching(/^repo-skill-snapshot-sync-/),
      },
    ]);
  });
});
