/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runSnapshotUploadWorkflow } from "./snapshot-upload-runner";
import { stageSnapshotUploadPayload } from "./snapshot-upload";
import { createWorkflowStepStub } from "./test-support";

describe("runSnapshotUploadWorkflow", () => {
  test("loads staged payload and uploads the snapshot files", async () => {
    const uploadCalls: { files: { content: string; path: string }[]; snapshotId: string }[] = [];
    const storage = new Map<string, string>();
    const bucket = {
      delete(key: string) {
        storage.delete(key);
        return Promise.resolve();
      },
      get(key: string) {
        const value = storage.get(key);
        return Promise.resolve(
          value
            ? {
                text: () => Promise.resolve(value),
              }
            : null,
        );
      },
      put(key: string, value: string) {
        storage.set(key, value);
        return Promise.resolve({});
      },
    };

    const stagedPayload = await stageSnapshotUploadPayload(bucket, {
      files: [
        {
          content: "hello",
          path: "skills/acme/widget/README.md",
        },
      ],
      snapshotId: "snapshot-1",
    });

    const result = await runSnapshotUploadWorkflow(
      {
        payload: stagedPayload,
      } as never,
      createWorkflowStepStub() as never,
      {
        snapshotFilesBucket: bucket,
        runUploadSnapshotFiles: (input) => {
          uploadCalls.push(input);
          return Promise.resolve({ workId: "upload-1" });
        },
      },
    );

    expect(uploadCalls).toEqual([
      {
        files: [
          {
            content: "hello",
            path: "skills/acme/widget/README.md",
          },
        ],
        snapshotId: "snapshot-1",
      },
    ]);
    expect(result).toEqual({
      filesCount: 1,
      snapshotId: "snapshot-1",
      status: "uploaded",
    });
  });

  test("loads staged payloads from r2 and cleans them up after completion", async () => {
    const storage = new Map<string, string>();
    const bucket = {
      delete(key: string) {
        storage.delete(key);
        return Promise.resolve();
      },
      get(key: string) {
        const value = storage.get(key);
        return Promise.resolve(
          value
            ? {
                text: () => Promise.resolve(value),
              }
            : null,
        );
      },
      put(key: string, value: string) {
        storage.set(key, value);
        return Promise.resolve({});
      },
    };

    const stagedPayload = await stageSnapshotUploadPayload(bucket, {
      files: [
        {
          content: "hello",
          path: "skills/acme/widget/README.md",
        },
      ],
      snapshotId: "snapshot-1",
    });

    const uploadCalls: { files: { content: string; path: string }[]; snapshotId: string }[] = [];
    const result = await runSnapshotUploadWorkflow(
      {
        payload: stagedPayload,
      } as never,
      createWorkflowStepStub() as never,
      {
        runUploadSnapshotFiles: (input) => {
          uploadCalls.push(input);
          return Promise.resolve({ workId: "upload-1" });
        },
        snapshotFilesBucket: bucket,
      },
    );

    expect(uploadCalls).toEqual([
      {
        files: [
          {
            content: "hello",
            path: "skills/acme/widget/README.md",
          },
        ],
        snapshotId: "snapshot-1",
      },
    ]);
    expect(result).toEqual({
      filesCount: 1,
      snapshotId: "snapshot-1",
      status: "uploaded",
    });
    expect(storage.size).toBe(0);
  });
});
