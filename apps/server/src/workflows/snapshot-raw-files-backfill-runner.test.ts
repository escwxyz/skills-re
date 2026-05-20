/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runSnapshotRawFilesBackfillWorkflow } from "./snapshot-raw-files-backfill-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runSnapshotRawFilesBackfillWorkflow", () => {
  test("backfills a batch of latest snapshots and enqueues continuation when more remain", async () => {
    const stepNames: string[] = [];
    const fetchTreeCalls: unknown[] = [];
    const fetchSkillFilesCalls: unknown[] = [];
    const uploadCalls: unknown[] = [];
    const continuationCalls: unknown[] = [];

    const result = await runSnapshotRawFilesBackfillWorkflow(
      {
        payload: {
          batchSize: 2,
          minSnapshotAgeMs: 5000,
          repoName: "skills",
          repoOwner: "acme",
        },
      },
      createWorkflowStepStub({
        onDo: (name) => {
          stepNames.push(name);
        },
      }) as never,
      {
        fetchCommitSha: ({ ref }) => Promise.resolve(ref),
        fetchSkillFilesForRoot: (input) => {
          fetchSkillFilesCalls.push(input);
          return Promise.resolve({
            files: [
              {
                content: "# backfilled",
                path: "SKILL.md",
              },
            ],
          });
        },
        fetchTree: (input) => {
          fetchTreeCalls.push(input);
          return Promise.resolve([
            {
              path: "skills/acme/widget/SKILL.md",
              sha: "blob-1",
              type: "blob",
            },
          ]);
        },
        hasGithubToken: () => true,
        listLatestSnapshotsForRawFilesBackfill: () =>
          Promise.resolve([
            {
              directoryPath: "skills/acme/widget",
              repoName: "skills",
              repoOwner: "acme",
              skillId: "skill-1",
              snapshotId: "snapshot-1",
              sourceCommitSha: "commit-1",
              syncTime: 100,
            },
            {
              directoryPath: "skills/acme/agent",
              repoName: "skills",
              repoOwner: "acme",
              skillId: "skill-2",
              snapshotId: "snapshot-2",
              sourceCommitSha: "commit-1",
              syncTime: 101,
            },
          ]),
        runUploadSnapshotFilesPipeline: (input) => {
          uploadCalls.push(input);
          return Promise.resolve({
            filesCount: input.files.length,
            snapshotId: input.snapshotId,
          });
        },
        scheduleContinuation: {
          enqueue: (input) => {
            continuationCalls.push(input);
            return Promise.resolve({ workId: "snapshot-raw-files-backfill-2" });
          },
        },
      },
    );

    expect(stepNames).toEqual([
      "snapshot-raw-files-backfill-fetch-batch-lastSeenSkillId-start",
      "snapshot-raw-files-backfill-upload-snapshot-1",
      "snapshot-raw-files-backfill-upload-snapshot-2",
      "snapshot-raw-files-backfill-enqueue-continuation",
    ]);
    expect(fetchTreeCalls).toEqual([
      {
        commitSha: "commit-1",
        owner: "acme",
        repo: "skills",
      },
    ]);
    expect(fetchSkillFilesCalls).toEqual([
      {
        owner: "acme",
        repo: "skills",
        skillRootPath: "skills/acme/widget",
        tree: [
          {
            path: "skills/acme/widget/SKILL.md",
            sha: "blob-1",
            type: "blob",
          },
        ],
      },
      {
        owner: "acme",
        repo: "skills",
        skillRootPath: "skills/acme/agent",
        tree: [
          {
            path: "skills/acme/widget/SKILL.md",
            sha: "blob-1",
            type: "blob",
          },
        ],
      },
    ]);
    expect(uploadCalls).toEqual([
      {
        files: [
          {
            content: "# backfilled",
            path: "SKILL.md",
          },
        ],
        snapshotId: "snapshot-1",
      },
      {
        files: [
          {
            content: "# backfilled",
            path: "SKILL.md",
          },
        ],
        snapshotId: "snapshot-2",
      },
    ]);
    expect(continuationCalls).toEqual([
      {
        batchSize: 2,
        lastSeenSkillId: "skill-2",
        minSnapshotAgeMs: 5000,
        repoName: "skills",
        repoOwner: "acme",
      },
    ]);
    expect(result).toEqual({
      failedCount: 0,
      failedSnapshots: [],
      hasMore: true,
      lastSeenSkillId: "skill-2",
      processed: 2,
      repoName: "skills",
      repoOwner: "acme",
      skippedCount: 0,
      skippedSnapshotIds: [],
      targetSnapshotIds: ["snapshot-1", "snapshot-2"],
      uploadedCount: 2,
      uploadedSnapshotIds: ["snapshot-1", "snapshot-2"],
    });
  });

  test("continues the batch when one snapshot backfill fails", async () => {
    const uploadCalls: unknown[] = [];
    const continuationCalls: unknown[] = [];

    const result = await runSnapshotRawFilesBackfillWorkflow(
      {
        payload: {
          batchSize: 2,
          minSnapshotAgeMs: 5000,
        },
      },
      createWorkflowStepStub() as never,
      {
        fetchCommitSha: ({ ref }) => Promise.resolve(ref),
        fetchSkillFilesForRoot: (input) => {
          if (input.skillRootPath === "skills/broken") {
            return Promise.reject(
              new Error(
                "GitHub request failed with 404 for https://api.github.com/repos/acme/skills/git/trees/missing?recursive=1 - Not Found",
              ),
            );
          }

          return Promise.resolve({
            files: [
              {
                content: "# backfilled",
                path: "SKILL.md",
              },
            ],
          });
        },
        fetchTree: () =>
          Promise.resolve([
            {
              path: "skills/working/SKILL.md",
              sha: "blob-1",
              type: "blob",
            },
          ]),
        hasGithubToken: () => true,
        listLatestSnapshotsForRawFilesBackfill: () =>
          Promise.resolve([
            {
              directoryPath: "skills/broken",
              repoName: "skills",
              repoOwner: "acme",
              skillId: "skill-1",
              snapshotId: "snapshot-1",
              sourceCommitSha: "missing",
              syncTime: 100,
            },
            {
              directoryPath: "skills/working",
              repoName: "skills",
              repoOwner: "acme",
              skillId: "skill-2",
              snapshotId: "snapshot-2",
              sourceCommitSha: "commit-2",
              syncTime: 101,
            },
          ]),
        runUploadSnapshotFilesPipeline: (input) => {
          uploadCalls.push(input);
          return Promise.resolve({
            filesCount: input.files.length,
            snapshotId: input.snapshotId,
          });
        },
        scheduleContinuation: {
          enqueue: (input) => {
            continuationCalls.push(input);
            return Promise.resolve({ workId: "snapshot-raw-files-backfill-2" });
          },
        },
      },
    );

    expect(uploadCalls).toEqual([
      {
        files: [
          {
            content: "# backfilled",
            path: "SKILL.md",
          },
        ],
        snapshotId: "snapshot-2",
      },
    ]);
    expect(continuationCalls).toEqual([
      {
        batchSize: 2,
        lastSeenSkillId: "skill-2",
        minSnapshotAgeMs: 5000,
        repoName: undefined,
        repoOwner: undefined,
      },
    ]);
    expect(result).toEqual({
      failedCount: 1,
      failedSnapshots: [
        {
          error:
            "GitHub request failed with 404 for https://api.github.com/repos/acme/skills/git/trees/missing?recursive=1 - Not Found",
          snapshotId: "snapshot-1",
        },
      ],
      hasMore: true,
      lastSeenSkillId: "skill-2",
      processed: 2,
      repoName: null,
      repoOwner: null,
      skippedCount: 0,
      skippedSnapshotIds: [],
      targetSnapshotIds: ["snapshot-1", "snapshot-2"],
      uploadedCount: 1,
      uploadedSnapshotIds: ["snapshot-2"],
    });
  });
});
