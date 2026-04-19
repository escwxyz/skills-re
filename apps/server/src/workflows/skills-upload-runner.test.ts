/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runSkillsUploadWorkflow } from "./skills-upload-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runSkillsUploadWorkflow", () => {
  test("loads the payload and delegates to the upload pipeline", async () => {
    const pipelineCalls: unknown[] = [];

    const result = await runSkillsUploadWorkflow(
      {
        payload: {
          repo: {
            createdAt: 1,
            defaultBranch: "main",
            forks: 1,
            license: "MIT",
            nameWithOwner: "acme/skills",
            owner: {
              handle: "acme",
            },
            stars: 2,
            updatedAt: 2,
          },
          recentCommits: [
            {
              sha: "head",
            },
          ],
          skills: [
            {
              description: "Widget skill",
              directoryPath: "skills/acme/widget",
              entryPath: "skills/acme/widget/skill.md",
              initialSnapshot: {
                files: [
                  {
                    content: "---\nname: widget\n---\n# Widget",
                    path: "skills/acme/widget/skill.md",
                  },
                ],
                sourceCommitDate: 1,
                sourceCommitSha: "commit-1",
                sourceRef: "main",
                tree: [
                  {
                    path: "skills/acme/widget/skill.md",
                    sha: "sha-1",
                    type: "blob",
                  },
                ],
              },
              slug: "widget",
              sourceLocator: "github:acme/skills",
              sourceType: "github",
              title: "Widget",
            },
          ],
        },
      } as never,
      createWorkflowStepStub() as never,
      {
        runUploadSkillsPipeline: (input) => {
          pipelineCalls.push(input);
          return Promise.resolve({
            ids: ["skill-1"],
            workId: "upload-1",
          });
        },
      },
    );

    expect(pipelineCalls).toHaveLength(1);
    expect(result).toEqual({
      ids: ["skill-1"],
      workId: "upload-1",
    });
  });
});
