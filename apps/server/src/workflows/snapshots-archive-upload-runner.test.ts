/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runSnapshotArchiveUploadWorkflow } from "./snapshots-archive-upload-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runSnapshotArchiveUploadWorkflow", () => {
  test("creates and uploads archive staging in order", async () => {
    const calls: string[] = [];
    const snapshotsService = {
      createSnapshotArchiveStaging(input: { snapshotId: string }) {
        calls.push(`create:${input.snapshotId}`);
        return Promise.resolve({
          archiveBytes: 12,
          archiveKey: "archives/acme/widget/skills.tar.gz",
          filesCount: 1,
          snapshotId: input.snapshotId,
          stagingKey: "snapshot-archive/staging/2024-01-01/abc.tar.gz",
        });
      },
      uploadSnapshotArchiveFromStaging(input: {
        archiveBytes: number;
        archiveKey: string;
        filesCount: number;
        snapshotId: string;
        stagingKey: string;
      }) {
        calls.push(`upload:${input.stagingKey}`);
        return Promise.resolve({
          archiveBytes: input.archiveBytes,
          archiveKey: input.archiveKey,
          filesCount: input.filesCount,
          snapshotId: input.snapshotId,
        });
      },
    } as const;

    const result = await runSnapshotArchiveUploadWorkflow(
      {
        payload: {
          snapshotId: "snapshot-1",
        },
        instanceId: "workflow-archive-1",
        timestamp: new Date(),
      },
      createWorkflowStepStub({
        onDo(name) {
          calls.push(name);
        },
      }) as never,
      {
        snapshotsService,
      },
    );

    expect(result).toEqual({
      archiveBytes: 12,
      archiveKey: "archives/acme/widget/skills.tar.gz",
      filesCount: 1,
      snapshotId: "snapshot-1",
    });
    expect(calls).toEqual([
      "create-snapshot-archive",
      "create:snapshot-1",
      "upload-snapshot-archive",
      "upload:snapshot-archive/staging/2024-01-01/abc.tar.gz",
    ]);
  });

  test("preserves default nested snapshot service methods when overriding one method", async () => {
    const calls: string[] = [];
    await expect(
      runSnapshotArchiveUploadWorkflow(
        {
          payload: {
            snapshotId: "snapshot-1",
          },
          instanceId: "workflow-archive-1",
          timestamp: new Date(),
        },
        createWorkflowStepStub({
          onDo(name) {
            calls.push(name);
          },
        }) as never,
        {
          snapshotsService: {
            createSnapshotArchiveStaging(input: { snapshotId: string }) {
              calls.push(`create:${input.snapshotId}`);
              return Promise.resolve({
                archiveBytes: 12,
                archiveKey: "archives/acme/widget/skills.tar.gz",
                filesCount: 1,
                snapshotId: input.snapshotId,
                stagingKey: "snapshot-archive/staging/2024-01-01/abc.tar.gz",
              });
            },
          },
        },
      ),
    ).rejects.toThrow("Snapshot archive upload pipeline is unavailable.");
    expect(calls).toEqual([
      "create-snapshot-archive",
      "create:snapshot-1",
      "upload-snapshot-archive",
    ]);
  });
});
