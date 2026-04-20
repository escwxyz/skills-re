/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { WorkflowCreateBinding } from "./scheduler";
import { makeWorkflowScheduler } from "./scheduler";

describe("makeWorkflowScheduler", () => {
  test("calls binding.create with a prefixed workflow id and returns the work id", async () => {
    let received:
      | {
          id?: string;
          params?: { snapshotId: string };
        }
      | undefined;

    const binding: WorkflowCreateBinding<{ snapshotId: string }> = {
      create(options) {
        received = options;
        return Promise.resolve({ id: "workflow-123" });
      },
    };

    const scheduler = makeWorkflowScheduler("snapshot-archive-upload", binding);

    await expect(
      scheduler.enqueue({
        snapshotId: "snapshot-1",
      }),
    ).resolves.toEqual({ workId: "workflow-123" });

    expect(received?.id).toMatch(/^snapshot-archive-upload-/);
    expect(received?.params).toEqual({
      snapshotId: "snapshot-1",
    });
  });
});
