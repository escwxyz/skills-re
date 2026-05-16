/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runRepoSkillImportWorkflow } from "./repo-skill-import-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runRepoSkillImportWorkflow", () => {
  test("builds a root-scoped GitHub payload and schedules the skills upload workflow", async () => {
    const buildPayloadCalls: unknown[] = [];
    const uploadCalls: unknown[] = [];

    const result = await runRepoSkillImportWorkflow(
      {
        payload: {
          repoName: "skills",
          repoOwner: "acme",
          skillRootPath: "skills/new",
        },
      } as never,
      createWorkflowStepStub() as never,
      {
        githubSubmit: {
          buildPayload: (input) => {
            buildPayloadCalls.push(input);
            return Promise.resolve({
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
                  updatedAt: 3,
                },
                skills: [
                  {
                    description: "New skill",
                    directoryPath: "skills/new",
                    entryPath: "skills/new/SKILL.md",
                    initialSnapshot: {
                      files: [
                        {
                          content: "---\nname: new\ndescription: New skill\n---\n# New",
                          path: "SKILL.md",
                        },
                      ],
                      sourceCommitDate: 1,
                      sourceCommitSha: "head-sha",
                      sourceRef: "main",
                      tree: [],
                    },
                    slug: "new",
                    sourceLocator: "github:acme/skills/skills/new/SKILL.md",
                    sourceType: "github",
                    title: "new",
                  },
                ],
              },
            });
          },
        },
        skillsUploadScheduler: {
          enqueue: (input) => {
            uploadCalls.push(input);
            return Promise.resolve({ workId: "skills-upload-1" });
          },
        },
      },
    );

    expect(buildPayloadCalls).toEqual([
      {
        owner: "acme",
        repo: "skills",
        skillRootPath: "skills/new",
      },
    ]);
    expect(uploadCalls).toHaveLength(1);
    expect(result).toEqual({
      status: "submitted",
      workId: "skills-upload-1",
    });
  });
});
