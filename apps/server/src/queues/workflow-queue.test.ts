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
