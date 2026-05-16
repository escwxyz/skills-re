/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runRepoSkillSnapshotSyncWorkflow } from "./repo-skill-snapshot-sync-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runRepoSkillSnapshotSyncWorkflow", () => {
  test("creates a new snapshot for one changed skill and uploads its files", async () => {
    const calls = {
      createSnapshot: [] as unknown[],
      deprecateSnapshotsBeyondLimit: [] as unknown[],
      setSkillLatestSnapshot: [] as unknown[],
      uploadSnapshotFiles: [] as unknown[],
    };

    const result = await runRepoSkillSnapshotSyncWorkflow(
      {
        payload: {
          expectedHeadSha: "head-sha",
          repoName: "skills",
          repoOwner: "acme",
          skillId: "skill-1",
          skillRootPath: "skills/existing",
        },
      } as never,
      createWorkflowStepStub() as never,
      {
        createSnapshot: (input) => {
          calls.createSnapshot.push(input);
          return Promise.resolve("snapshot-2");
        },
        deprecateSnapshotsBeyondLimit: (input) => {
          calls.deprecateSnapshotsBeyondLimit.push(input);
          return Promise.resolve();
        },
        fetchRepoOverview: () =>
          Promise.resolve({
            commits: [
              {
                committedDate: "2026-05-16T10:00:00.000Z",
                message: "feat: update existing",
                sha: "head-sha",
                url: "https://github.com/acme/skills/commit/head-sha",
              },
            ],
            defaultBranch: "main",
            headSha: "head-sha",
          }),
        fetchSkillFilesForRoot: () =>
          Promise.resolve({
            files: [
              {
                content: "---\nname: existing\ndescription: Existing skill\n---\n# Existing v2",
                path: "SKILL.md",
              },
            ],
          }),
        fetchTree: () =>
          Promise.resolve([
            {
              path: "skills/existing/SKILL.md",
              sha: "blob-existing",
              type: "blob" as const,
            },
          ]),
        findRepoByNameWithOwner: () =>
          Promise.resolve({
            id: "repo-1",
            updatedAt: 123,
          }),
        listRepoSkillSnapshotHeadsByRepoId: () =>
          Promise.resolve([
            {
              directoryPath: "skills/existing",
              entryPath: "skills/existing/SKILL.md",
              latestDescription: "Existing skill",
              latestHash: "old-hash",
              latestName: "existing",
              latestSnapshotId: "snapshot-1",
              latestSourceCommitSha: "old-head",
              latestVersion: "1.0.0",
              skillId: "skill-1",
              slug: "existing",
            },
          ]),
        setSkillLatestSnapshot: (input) => {
          calls.setSkillLatestSnapshot.push(input);
          return Promise.resolve();
        },
        uploadSnapshotFiles: (input) => {
          calls.uploadSnapshotFiles.push(input);
          return Promise.resolve({ workId: "snapshot-upload-1" });
        },
      },
    );

    expect(calls.createSnapshot).toEqual([
      {
        description: "Existing skill",
        directoryPath: "skills/existing",
        entryPath: "skills/existing/SKILL.md",
        hash: expect.any(String),
        name: "existing",
        skillId: "skill-1",
        sourceCommitDate: Date.parse("2026-05-16T10:00:00.000Z"),
        sourceCommitMessage: "feat: update existing",
        sourceCommitSha: "head-sha",
        sourceCommitUrl: "https://github.com/acme/skills/commit/head-sha",
        syncTime: Date.parse("2026-05-16T10:00:00.000Z"),
        version: "1.0.1",
      },
    ]);
    expect(calls.uploadSnapshotFiles).toEqual([
      {
        files: [
          {
            content: "---\nname: existing\ndescription: Existing skill\n---\n# Existing v2",
            path: "SKILL.md",
          },
        ],
        snapshotId: "snapshot-2",
      },
    ]);
    expect(calls.setSkillLatestSnapshot).toEqual([
      {
        latestCommitDate: Date.parse("2026-05-16T10:00:00.000Z"),
        latestCommitMessage: "feat: update existing",
        latestCommitSha: "head-sha",
        latestCommitUrl: "https://github.com/acme/skills/commit/head-sha",
        skillId: "skill-1",
        snapshotId: "snapshot-2",
        version: "1.0.1",
      },
    ]);
    expect(calls.deprecateSnapshotsBeyondLimit).toEqual([
      {
        keepLatest: 3,
        skillId: "skill-1",
      },
    ]);
    expect(result).toEqual({
      snapshotId: "snapshot-2",
      status: "completed",
      uploadWorkId: "snapshot-upload-1",
    });
  });
});
