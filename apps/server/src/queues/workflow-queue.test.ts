/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { processWorkflowQueueBatch } from "./workflow-queue";
import { createWorkerLogger } from "../worker-logger";

describe("processWorkflowQueueBatch", () => {
  test("logs workflow start failures with a structured failure record", async () => {
    const originalConsoleError = console.error;
    const logs: unknown[] = [];
    console.error = (...args: unknown[]) => {
      logs.push(args[0]);
    };

    const retryCalls: number[] = [];
    const message = {
      ack() {},
      body: {
        kind: "snapshot-archive-upload",
        payload: {
          snapshotId: "snapshot-1",
        },
        workflowId: "workflow-1",
      },
      retry() {
        retryCalls.push(1);
      },
    };

    const env = {
      SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW: {
        create: () => {
          throw new Error("boom");
        },
      },
    } as never;

    try {
      await processWorkflowQueueBatch(
        {
          messages: [message],
        } as never,
        env,
        createWorkerLogger({ component: "workflow.queue" }),
      );
    } finally {
      console.error = originalConsoleError;
    }

    expect(retryCalls).toEqual([1]);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      component: "workflow.queue",
      entrypoint: "WorkflowQueue",
      error: {
        message: "boom",
        name: "Error",
      },
      event: "workflow.failed",
      instanceId: "workflow-1",
      kind: "snapshot-archive-upload",
      level: "error",
      workflowId: "workflow-1",
      workflowName: "skills-re-v1-snapshots-archive-upload",
    });
  });

  test("acks invalid queue messages", async () => {
    let acked = false;
    const logger = {
      error() {},
      info() {},
      warn() {},
      debug() {},
      child() {
        return this;
      },
    };

    await processWorkflowQueueBatch(
      {
        messages: [
          {
            ack() {
              acked = true;
            },
            body: { bad: true },
            retry() {
              throw new Error("should not retry invalid messages");
            },
          },
        ],
      } as never,
      {} as never,
      logger as never,
    );

    expect(acked).toBe(true);
  });

  test("starts repo skill fan-out workflows from queue messages", async () => {
    const created: { binding: string; id: string; params: unknown }[] = [];
    const acked: string[] = [];

    await processWorkflowQueueBatch(
      {
        messages: [
          {
            ack() {
              acked.push("import");
            },
            body: {
              kind: "repo-skill-import",
              payload: {
                repoName: "skills",
                repoOwner: "acme",
                skillRootPath: "skills/new",
              },
              workflowId: "repo-skill-import-1",
            },
            retry() {
              throw new Error("should not retry import");
            },
          },
          {
            ack() {
              acked.push("snapshot");
            },
            body: {
              kind: "repo-skill-snapshot-sync",
              payload: {
                expectedHeadSha: "head-sha",
                repoName: "skills",
                repoOwner: "acme",
                skillId: "skill-1",
                skillRootPath: "skills/existing",
              },
              workflowId: "repo-skill-snapshot-sync-1",
            },
            retry() {
              throw new Error("should not retry snapshot");
            },
          },
        ],
      } as never,
      {
        REPO_SKILL_IMPORT_WORKFLOW: {
          create({ id, params }: { id: string; params: unknown }) {
            created.push({ binding: "import", id, params });
            return Promise.resolve({ id });
          },
        },
        REPO_SKILL_SNAPSHOT_SYNC_WORKFLOW: {
          create({ id, params }: { id: string; params: unknown }) {
            created.push({ binding: "snapshot", id, params });
            return Promise.resolve({ id });
          },
        },
      } as never,
      {
        error() {},
        info() {},
        warn() {},
        debug() {},
        child() {
          return this;
        },
      } as never,
    );

    expect(acked).toEqual(["import", "snapshot"]);
    expect(created).toEqual([
      {
        binding: "import",
        id: "repo-skill-import-1",
        params: {
          repoName: "skills",
          repoOwner: "acme",
          skillRootPath: "skills/new",
        },
      },
      {
        binding: "snapshot",
        id: "repo-skill-snapshot-sync-1",
        params: {
          expectedHeadSha: "head-sha",
          repoName: "skills",
          repoOwner: "acme",
          skillId: "skill-1",
          skillRootPath: "skills/existing",
        },
      },
    ]);
  });

  test("rejects legacy inline skills-upload queue messages", async () => {
    let acked = false;
    let createCalled = false;
    const logger = {
      error() {},
      info() {},
      warn() {},
      debug() {},
      child() {
        return this;
      },
    };

    await processWorkflowQueueBatch(
      {
        messages: [
          {
            ack() {
              acked = true;
            },
            body: {
              kind: "skills-upload",
              payload: {
                repo: {
                  createdAt: 1,
                  defaultBranch: "main",
                  forks: 1,
                  license: "MIT",
                  nameWithOwner: "acme/skills",
                  owner: {
                    handle: "acme",
                  },
                  stars: 2,
                  updatedAt: 2,
                },
                skills: [],
              },
              workflowId: "workflow-1",
            },
            retry() {
              throw new Error("should not retry invalid messages");
            },
          },
        ],
      } as never,
      {
        SKILLS_UPLOAD_WORKFLOW: {
          create() {
            createCalled = true;
            return Promise.resolve({ id: "workflow-1" });
          },
        },
      } as never,
      logger as never,
    );

    expect(acked).toBe(true);
    expect(createCalled).toBe(false);
  });

  test("safely logs cyclic invalid queue bodies before acking", async () => {
    const originalConsoleError = console.error;
    const logs: unknown[] = [];
    console.error = (...args: unknown[]) => {
      logs.push(args[0]);
    };

    let acked = false;
    const body: Record<string, unknown> = {};
    body.self = body;

    try {
      await processWorkflowQueueBatch(
        {
          messages: [
            {
              ack() {
                acked = true;
              },
              body,
              retry() {
                throw new Error("should not retry invalid messages");
              },
            },
          ],
        } as never,
        {} as never,
        createWorkerLogger({ component: "workflow.queue" }),
      );
    } finally {
      console.error = originalConsoleError;
    }

    expect(acked).toBe(true);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      bodyKeys: ["self"],
      bodyType: "object",
      component: "workflow.queue",
      event: "workflow.queue.invalid-message",
      level: "error",
    });
  });
});
