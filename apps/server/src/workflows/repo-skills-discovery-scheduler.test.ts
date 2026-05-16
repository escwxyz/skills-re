/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  getRepoSkillImportWorkflowQueueScheduler,
  getRepoSkillSnapshotSyncWorkflowQueueScheduler,
} from "./repo-skills-discovery-scheduler";

describe("repo skill fan-out queue schedulers", () => {
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
