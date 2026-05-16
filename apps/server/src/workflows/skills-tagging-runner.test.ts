/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runSkillsTaggingWorkflow } from "./skills-tagging-runner";
import { createWorkflowStepStub } from "./test-support";

const readSnapshotFileContent = () =>
  Promise.resolve({
    content: "snapshot content",
  });

describe("runSkillsTaggingWorkflow", () => {
  test("runs the tagging pipeline inside a workflow step", async () => {
    const stepNames: string[] = [];

    await runSkillsTaggingWorkflow(
      {
        payload: {
          skillIds: ["skill-1"],
        },
      },
      {
        runSkillsTaggingPipeline: () =>
          Promise.resolve({
            failedCount: 0,
            updatedCount: 1,
          }),
      },
      createWorkflowStepStub({
        onDo: (name) => {
          stepNames.push(name);
        },
      }) as never,
    );

    expect(stepNames).toEqual(["run-skills-tagging-pipeline"]);
  });

  test("forwards the snapshot reader to the tagging pipeline", async () => {
    let forwardedSnapshotReader: unknown;

    await runSkillsTaggingWorkflow(
      {
        payload: {
          skillIds: ["skill-1"],
        },
      },
      {
        readSnapshotFileContent,
        runSkillsTaggingPipeline: (_input, _aiTasks, runtimeDeps) => {
          forwardedSnapshotReader = runtimeDeps?.readSnapshotFileContent;
          return Promise.resolve({
            failedCount: 0,
            updatedCount: 0,
          });
        },
      },
    );

    expect(forwardedSnapshotReader).toBe(readSnapshotFileContent);
  });

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
