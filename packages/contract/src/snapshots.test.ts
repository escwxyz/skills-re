/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { snapshotsContract } from "./snapshots";
import {
  fileContentSchema,
  snapshotCreateHistoricalSnapshotsInputSchema,
  snapshotDownloadEntrySchema,
  snapshotFileManifestEntrySchema,
  snapshotFileSignedUrlSchema,
  snapshotItemSchema,
  snapshotTreeEntrySchema,
} from "./common/snapshots";

describe("snapshots contract", () => {
  test("accepts a snapshot list item payload", () => {
    expect(
      snapshotItemSchema.parse({
        archiveR2Key: "snapshots/acme/widget.zip",
        description: "Widget skill snapshot",
        directoryPath: "skills/acme/widget/",
        entryPath: "skills/acme/widget/skill.md",
        hash: "hash-1",
        id: "snapshot-1",
        isDeprecated: false,
        name: "widget",
        skillId: "skill-1",
        sourceCommitDate: 1_717_011_200_000,
        sourceCommitMessage: "feat: add widget",
        sourceCommitSha: "sha-1",
        sourceCommitUrl: "https://github.com/acme/widget/commit/sha-1",
        syncTime: 1_717_011_200_000,
        version: "1.0.0",
      }),
    ).toEqual({
      archiveR2Key: "snapshots/acme/widget.zip",
      description: "Widget skill snapshot",
      directoryPath: "skills/acme/widget/",
      entryPath: "skills/acme/widget/skill.md",
      hash: "hash-1",
      id: "snapshot-1",
      isDeprecated: false,
      name: "widget",
      skillId: "skill-1",
      sourceCommitDate: 1_717_011_200_000,
      sourceCommitMessage: "feat: add widget",
      sourceCommitSha: "sha-1",
      sourceCommitUrl: "https://github.com/acme/widget/commit/sha-1",
      syncTime: 1_717_011_200_000,
      version: "1.0.0",
    });
  });

  test("accepts a snapshot file manifest entry payload", () => {
    expect(
      snapshotFileManifestEntrySchema.parse({
        contentType: "text/markdown; charset=utf-8",
        fileHash: "hash-1",
        path: "skills/acme/widget/README.md",
        r2Key: "snapshots/acme/widget/README.md",
        size: 12,
        sourceSha: "sha-1",
      }),
    ).toEqual({
      contentType: "text/markdown; charset=utf-8",
      fileHash: "hash-1",
      path: "skills/acme/widget/README.md",
      r2Key: "snapshots/acme/widget/README.md",
      size: 12,
      sourceSha: "sha-1",
    });
  });

  test("keeps the snapshot signed url shape stable", () => {
    expect(
      snapshotFileSignedUrlSchema.parse({
        contentType: "text/markdown; charset=utf-8",
        etag: "hash-1",
        size: 12,
        url: "https://cdn.example/snapshots/acme/widget/README.md",
      }),
    ).toEqual({
      contentType: "text/markdown; charset=utf-8",
      etag: "hash-1",
      size: 12,
      url: "https://cdn.example/snapshots/acme/widget/README.md",
    });
  });

  test("accepts a snapshot file content payload", () => {
    expect(
      fileContentSchema.parse({
        content: "hello world",
        path: "skills/acme/widget/README.md",
      }),
    ).toEqual({
      content: "hello world",
      path: "skills/acme/widget/README.md",
    });
  });

  test("accepts a snapshot tree entry payload", () => {
    expect(
      snapshotTreeEntrySchema.parse({
        path: "skills/acme/widget/README.md",
        type: "blob",
      }),
    ).toEqual({
      path: "skills/acme/widget/README.md",
      type: "blob",
    });
  });

  test("accepts a historical snapshot creation request", () => {
    expect(
      snapshotCreateHistoricalSnapshotsInputSchema.parse({
        commits: [
          {
            committedDate: "2026-04-18T12:00:00.000Z",
            message: "feat: add widget",
            sha: "sha-1",
            url: "https://github.com/acme/widget/commit/sha-1",
          },
        ],
        repoName: "widget",
        repoOwner: "acme",
        skillIds: ["skill-1"],
      }),
    ).toEqual({
      commits: [
        {
          committedDate: "2026-04-18T12:00:00.000Z",
          message: "feat: add widget",
          sha: "sha-1",
          url: "https://github.com/acme/widget/commit/sha-1",
        },
      ],
      repoName: "widget",
      repoOwner: "acme",
      skillIds: ["skill-1"],
    });
  });

  test("exposes the snapshots routes used by the API layer", () => {
    expect(snapshotsContract.listBySkill).toBeDefined();
    expect(snapshotsContract.getBySkillAndVersion).toBeDefined();
    expect(snapshotsContract.uploadSnapshotFiles).toBeDefined();
    expect(snapshotsContract.getSnapshotDownloadManifest).toBeDefined();
    expect(snapshotsContract.getSnapshotFileSignedUrl).toBeDefined();
    expect(snapshotsContract.readSnapshotFileContent).toBeDefined();
    expect(snapshotsContract.getSnapshotTreeEntries).toBeDefined();
    expect(snapshotsContract.createHistoricalSnapshots).toBeDefined();
  });

  test("accepts a snapshot download entry payload", () => {
    expect(
      snapshotDownloadEntrySchema.parse({
        contentType: "text/markdown; charset=utf-8",
        path: "skills/acme/widget/README.md",
        size: 12,
        url: "https://cdn.example/snapshots/acme/widget/README.md",
      }),
    ).toEqual({
      contentType: "text/markdown; charset=utf-8",
      path: "skills/acme/widget/README.md",
      size: 12,
      url: "https://cdn.example/snapshots/acme/widget/README.md",
    });
  });
});
