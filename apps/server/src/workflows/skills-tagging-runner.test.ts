/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runSkillsTaggingWorkflow } from "./skills-tagging-runner";

describe("runSkillsTaggingWorkflow", () => {
  test("fails before tagging when categorization is requested but unavailable", async () => {
    const pipelineCalls: unknown[] = [];

    await expect(
      runSkillsTaggingWorkflow(
        {
          payload: {
            skillIds: ["skill-1"],
            triggerCategorizationAfterTagging: true,
          },
        },
        {
          runSkillsTaggingPipeline: (input) => {
            pipelineCalls.push(input);
            return Promise.resolve({
              failedCount: 0,
              updatedCount: 0,
            });
          },
        },
      ),
    ).rejects.toThrow(
      "Skills categorization workflow binding is unavailable. Configure SKILLS_CATEGORIZATION_WORKFLOW.",
    );

    expect(pipelineCalls).toHaveLength(0);
  });
});
