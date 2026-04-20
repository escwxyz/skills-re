/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asSnapshotId } from "@skills-re/db/utils";

import { runStaticAuditBackfillWorkflow } from "./static-audit-backfill-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runStaticAuditBackfillWorkflow", () => {
  test("delegates the backfill batch to the static audits service", async () => {
    const dispatchCalls: { batchSize?: number; minSnapshotAgeMs?: number }[] = [];

    const result = await runStaticAuditBackfillWorkflow(
      {
        payload: {
          batchSize: 9,
          minSnapshotAgeMs: 1234,
        },
      } as never,
      createWorkflowStepStub() as never,
      {
        dispatchMissingSnapshotAuditsBatch: (input) => {
          dispatchCalls.push(input ?? {});
          return Promise.resolve({
            batchSize: 9,
            dispatchReason: undefined,
            dispatched: true as const,
            eligibleCount: 1,
            minSnapshotAgeMs: 1234,
            offset: 0,
            pageCount: 1,
            repository: "acme/skills-audit",
            selectedCount: 1,
            skippedMissingCommitShaCount: 0,
            targetSnapshotIds: [asSnapshotId("snapshot-1")],
            workflowFile: "skill-audit-submit.yml",
          });
        },
      },
    );

    expect(dispatchCalls).toEqual([{ batchSize: 9, minSnapshotAgeMs: 1234 }]);
    expect(result).toEqual({
      batchSize: 9,
      dispatchReason: undefined,
      dispatched: true,
      eligibleCount: 1,
      minSnapshotAgeMs: 1234,
      offset: 0,
      pageCount: 1,
      repository: "acme/skills-audit",
      selectedCount: 1,
      skippedMissingCommitShaCount: 0,
      targetSnapshotIds: [asSnapshotId("snapshot-1")],
      workflowFile: "skill-audit-submit.yml",
    });
  });
});
