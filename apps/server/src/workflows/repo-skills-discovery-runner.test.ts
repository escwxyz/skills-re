/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runRepoSkillsDiscoveryWorkflow } from "./repo-skills-discovery-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runRepoSkillsDiscoveryWorkflow", () => {
  test("fans out added skill roots and changed existing skills while ignoring missing skills", async () => {
    const importJobs: unknown[] = [];
    const snapshotJobs: unknown[] = [];

    const result = await runRepoSkillsDiscoveryWorkflow(
      {
        payload: {
          repoName: "skills",
          repoOwner: "acme",
        },
      } as never,
      createWorkflowStepStub() as never,
      {
        fetchRepoOverview: () =>
          Promise.resolve({
            commits: [
              {
                committedDate: "2026-05-16T10:00:00.000Z",
                message: "feat: update skills",
                sha: "head-sha",
                url: "https://github.com/acme/skills/commit/head-sha",
              },
            ],
            defaultBranch: "main",
            headSha: "head-sha",
          }),
        fetchTree: () =>
          Promise.resolve([
            {
              path: "skills/existing/SKILL.md",
              sha: "blob-existing",
              type: "blob" as const,
            },
            {
              path: "skills/new/SKILL.md",
              sha: "blob-new",
              type: "blob" as const,
            },
          ]),
        findRepoByNameWithOwner: () =>
          Promise.resolve({
            id: "repo-1",
            updatedAt: 123,
          }),
        importScheduler: {
          enqueue: (input) => {
            importJobs.push(input);
            return Promise.resolve({ workId: "import-1" });
          },
        },
        listRepoSkillSnapshotHeadsByRepoId: () =>
          Promise.resolve([
            {
              directoryPath: "skills/existing",
              entryPath: "skills/existing/SKILL.md",
              latestDescription: "Existing skill",
              latestHash: "old-hash",
              latestName: "existing",
              latestSnapshotId: "snapshot-existing",
              latestSourceCommitSha: "old-head",
              latestVersion: "1.0.0",
              skillId: "skill-existing",
              slug: "existing",
            },
            {
              directoryPath: "skills/missing",
              entryPath: "skills/missing/SKILL.md",
              latestDescription: "Missing skill",
              latestHash: "missing-hash",
              latestName: "missing",
              latestSnapshotId: "snapshot-missing",
              latestSourceCommitSha: "old-head",
              latestVersion: "1.0.0",
              skillId: "skill-missing",
              slug: "missing",
            },
          ]),
        snapshotSyncScheduler: {
          enqueue: (input) => {
            snapshotJobs.push(input);
            return Promise.resolve({ workId: "snapshot-1" });
          },
        },
      },
    );

    expect(importJobs).toEqual([
      {
        repoName: "skills",
        repoOwner: "acme",
        skillRootPath: "skills/new",
      },
    ]);
    expect(snapshotJobs).toEqual([
      {
        expectedHeadSha: "head-sha",
        repoName: "skills",
        repoOwner: "acme",
        skillId: "skill-existing",
        skillRootPath: "skills/existing",
      },
    ]);
    expect(result).toEqual({
      addedCount: 1,
      changedCount: 1,
      headSha: "head-sha",
      ignoredMissingCount: 1,
      status: "completed",
      unchangedCount: 0,
    });
  });
});
