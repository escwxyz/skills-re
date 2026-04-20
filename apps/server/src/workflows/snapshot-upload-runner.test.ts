/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runSnapshotUploadWorkflow } from "./snapshot-upload-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runSnapshotUploadWorkflow", () => {
  test("loads staged payload and uploads the snapshot files", async () => {
    const uploadCalls: { files: { content: string; path: string }[]; snapshotId: string }[] = [];

    const result = await runSnapshotUploadWorkflow(
      {
        payload: {
          files: [
            {
              content: "hello",
              path: "skills/acme/widget/README.md",
            },
          ],
          snapshotId: "snapshot-1",
        },
      } as never,
      createWorkflowStepStub() as never,
      {
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
});
