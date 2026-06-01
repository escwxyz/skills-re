/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { getSnapshotUploadWorkflowScheduler } from "./snapshot-upload";

describe("getSnapshotUploadWorkflowScheduler", () => {
  test("stages snapshot upload payloads before creating the workflow", async () => {
    const storage = new Map<string, string>();
    const puts: string[] = [];
    const creates: { id: string; params: unknown }[] = [];

    const scheduler = getSnapshotUploadWorkflowScheduler({
      SNAPSHOT_FILES: {
        delete: (key: string) => {
          storage.delete(key);
          return Promise.resolve();
        },
        get: (key: string) => {
          const value = storage.get(key);
          return Promise.resolve(
            value
              ? {
                  text: () => Promise.resolve(value),
                }
              : null,
          );
        },
        put: (key: string, value: string) => {
          storage.set(key, value);
          puts.push(key);
          return Promise.resolve({});
        },
      },
      SNAPSHOT_UPLOAD_WORKFLOW: {
        create: async ({ id, params }: { id: string; params: unknown }) => {
          creates.push({ id, params });
          return { id };
        },
      },
    } as never);

    if (!scheduler) {
      throw new Error("Expected snapshot upload scheduler.");
    }

    const result = await scheduler.enqueue({
      files: [
        {
          content: "hello",
          path: "skills/acme/widget/README.md",
        },
      ],
      snapshotId: "snapshot-1",
    });

    expect(result).toEqual({ workId: expect.any(String) });
    expect(puts).toHaveLength(1);
    expect(creates).toHaveLength(1);
    expect(creates[0]?.params).toMatchObject({
      stagingKey: expect.stringMatching(/^snapshot-upload\/staging\//),
    });
    expect(storage.size).toBe(1);
  });

  test("queues staged snapshot uploads when queue bindings are available", async () => {
    const storage = new Map<string, string>();
    const sends: {
      message: unknown;
      options?: {
        delaySeconds?: number;
      };
    }[] = [];
    const creates: { id: string; params: unknown }[] = [];

    const scheduler = getSnapshotUploadWorkflowScheduler({
      SNAPSHOT_FILES: {
        delete: (key: string) => {
          storage.delete(key);
          return Promise.resolve();
        },
        get: (key: string) => {
          const value = storage.get(key);
          return Promise.resolve(
            value
              ? {
                  text: () => Promise.resolve(value),
                }
              : null,
          );
        },
        put: (key: string, value: string) => {
          storage.set(key, value);
          return Promise.resolve({});
        },
      },
      SNAPSHOT_UPLOAD_WORKFLOW: {
        create: async ({ id, params }: { id: string; params: unknown }) => {
          creates.push({ id, params });
          return { id };
        },
      },
      SNAPSHOT_UPLOAD_WORKFLOW_QUEUE_2: {
        send: (message: unknown, options?: { delaySeconds?: number }) => {
          sends.push({ message, options });
          return Promise.resolve({});
        },
      },
    } as never);

    if (!scheduler) {
      throw new Error("Expected snapshot upload scheduler.");
    }

    const result = await scheduler.enqueue({
      files: [
        {
          content: "hello",
          path: "skills/acme/widget/README.md",
        },
      ],
      snapshotId: "snapshot-queue-1",
    });

    expect(result).toEqual({ workId: expect.any(String) });
    expect(sends).toHaveLength(1);
    expect(creates).toHaveLength(0);
    expect(sends[0]?.message).toMatchObject({
      kind: "snapshot-upload",
      payload: {
        stagingKey: expect.stringMatching(/^snapshot-upload\/staging\//),
      },
      workflowId: expect.stringMatching(/^snapshot-upload-/),
    });
    expect(sends[0]?.options?.delaySeconds).toBeGreaterThanOrEqual(0);
    expect(sends[0]?.options?.delaySeconds).toBeLessThanOrEqual(90);
    expect(storage.size).toBe(1);
  });
});
