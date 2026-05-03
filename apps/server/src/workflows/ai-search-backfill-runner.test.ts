/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runAiSearchBackfillWorkflow } from "./ai-search-backfill-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runAiSearchBackfillWorkflow", () => {
  test("forwards the last seen id cursor and returns the last processed skill id", async () => {
    const listCalls: { batchSize: number; lastSeenId?: string }[] = [];

    const result = await runAiSearchBackfillWorkflow(
      {
        payload: {
          batchSize: 2,
          lastSeenId: "skill-001",
        },
      } as never,
      createWorkflowStepStub() as never,
      {
        aiSearchItems: {
          uploadItem: () => {
            throw new Error("unexpected upload");
          },
        } as never,
        listSkillsForAiSearchBackfill: (input) => {
          listCalls.push(input);
          return Promise.resolve([
            {
              aiSearchItemId: null,
              authorHandle: "acme",
              repoName: "skills",
              skillId: "skill-010",
              skillMdR2Key: null,
              skillSlug: "alpha",
              snapshotId: null,
              version: null,
            },
            {
              aiSearchItemId: null,
              authorHandle: "acme",
              repoName: "skills",
              skillId: "skill-020",
              skillMdR2Key: null,
              skillSlug: "beta",
              snapshotId: null,
              version: null,
            },
          ]);
        },
        snapshotStorage: {
          getSnapshotFileObject: () => {
            throw new Error("unexpected snapshot lookup");
          },
        } as never,
        updateSkillAiSearchItemId: () => Promise.resolve(),
      },
    );

    expect(listCalls).toEqual([{ batchSize: 2, lastSeenId: "skill-001" }]);
    expect(result).toEqual({
      nextLastSeenId: "skill-020",
      processed: 2,
    });
  });
});
