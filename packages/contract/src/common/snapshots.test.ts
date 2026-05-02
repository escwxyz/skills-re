/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  githubCommitSchema,
  snapshotCreateHistoricalSnapshotsInputSchema,
  snapshotFileManifestEntrySchema,
  snapshotItemSchema,
} from "./snapshots";

describe("snapshot shared schemas", () => {
  test("accepts a historical snapshot request payload", () => {
    expect(
      snapshotCreateHistoricalSnapshotsInputSchema.parse({
        commits: [
          {
            committedDate: "2026-04-18T00:00:00.000Z",
            message: "initial import",
            sha: "abc123",
            url: "https://github.com/example/repo/commit/abc123",
          },
        ],
        repoName: "repo-name",
        repoOwner: "example",
        skillIds: ["skill_123"],
      }),
    ).toEqual({
      commits: [
        {
          committedDate: "2026-04-18T00:00:00.000Z",
          message: "initial import",
          sha: "abc123",
          url: "https://github.com/example/repo/commit/abc123",
        },
      ],
      repoName: "repo-name",
      repoOwner: "example",
      skillIds: ["skill_123"],
    });
  });

  test("accepts a snapshot metadata payload from persistence", () => {
    expect(
      snapshotItemSchema.parse({
        archiveR2Key: "snapshot.tar.gz",
        description: "Snapshot description",
        directoryPath: "skills/example/",
        entryPath: "skill.md",
        hash: "sha256:abc123",
        id: "snap_123",
        isDeprecated: false,
        name: "Example Skill",
        skillId: "skill_123",
        sourceCommitDate: 1_717_011_200_000,
        sourceCommitMessage: "initial import",
        sourceCommitSha: "abc123",
        sourceCommitUrl: "https://github.com/example/repo/commit/abc123",
        syncTime: 1_717_011_200_000,
        version: "1.0.0",
      }),
    ).toMatchObject({
      id: "snap_123",
      skillId: "skill_123",
      version: "1.0.0",
    });
  });

  test("preserves optional manifest metadata for downloadable files", () => {
    expect(
      snapshotFileManifestEntrySchema.parse({
        contentType: "text/markdown",
        fileHash: "sha256:file",
        path: "skill.md",
        r2Key: "snapshot-files/skill.md",
        size: 42,
        sourceSha: "abc123",
      }),
    ).toEqual({
      contentType: "text/markdown",
      fileHash: "sha256:file",
      path: "skill.md",
      r2Key: "snapshot-files/skill.md",
      size: 42,
      sourceSha: "abc123",
    });
  });

  test("accepts raw github commit payloads used by snapshot history", () => {
    expect(
      githubCommitSchema.parse({
        committedDate: null,
        message: "fix",
        sha: "abc123",
        url: null,
      }),
    ).toEqual({
      committedDate: null,
      message: "fix",
      sha: "abc123",
      url: null,
    });
  });
});
