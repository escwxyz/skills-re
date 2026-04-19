/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asSnapshotId } from "@skills-re/db/utils";

import { encodeCursor } from "../shared/pagination";
import { createSnapshotsService } from "./service";

describe("snapshots service", () => {
  test("creates a historical snapshot when no matching commit exists", async () => {
    const snapshotCalls: {
      description: string;
      directoryPath: string;
      entryPath: string;
      hash: string;
      name: string;
      skillId: string;
      sourceCommitDate?: number;
      sourceCommitMessage?: string | null;
      sourceCommitSha: string;
      sourceCommitUrl?: string | null;
      syncTime: number;
      version: string;
    }[] = [];
    const uploadCalls: {
      files: { content: string; path: string }[];
      snapshotId: string;
    }[] = [];

    const service = createSnapshotsService({
      createSnapshot: async (input) => {
        snapshotCalls.push(input);
        return "snapshot-1";
      },
      deprecateSnapshotsBeyondLimit: async () => undefined,
      getSnapshotBySkillAndCommit: async () => null,
      uploadSnapshotFiles: async (input) => {
        uploadCalls.push(input);
        return { workId: "workflow-1" };
      },
    });

    await expect(
      service.createHistoricalSnapshot({
        description: "Widget skill",
        directoryPath: "skills/acme/widget/",
        entryPath: "skills/acme/widget/skill.md",
        files: [
          {
            content: "skill content",
            path: "skills/acme/widget/skill.md",
          },
        ],
        name: "widget",
        skillId: "skill-1",
        sourceCommitDate: Date.parse("2024-01-02T00:00:00.000Z"),
        sourceCommitMessage: "feat: add widget",
        sourceCommitSha: "sha-1",
        sourceCommitUrl: "https://github.com/acme/widget/commit/sha-1",
        version: "1.1.0",
      }),
    ).resolves.toEqual("snapshot-1");

    expect(snapshotCalls).toEqual([
      {
        description: "Widget skill",
        directoryPath: "skills/acme/widget/",
        entryPath: "skills/acme/widget/skill.md",
        hash: "f673b3a57705b4279e1deb5f59f3e0012c5097bbe84f3bda0509d4bf2c5d1c35",
        name: "widget",
        skillId: "skill-1",
        sourceCommitDate: Date.parse("2024-01-02T00:00:00.000Z"),
        sourceCommitMessage: "feat: add widget",
        sourceCommitSha: "sha-1",
        sourceCommitUrl: "https://github.com/acme/widget/commit/sha-1",
        syncTime: Date.parse("2024-01-02T00:00:00.000Z"),
        version: "1.1.0",
      },
    ]);
    expect(uploadCalls).toEqual([
      {
        files: [
          {
            content: "skill content",
            path: "skills/acme/widget/skill.md",
          },
        ],
        snapshotId: "snapshot-1",
      },
    ]);
  });

  test("maps listBySkill cursors and snapshot fields using the contract shape", async () => {
    const calls: { cursor: { id: string; syncTime: number } | null; limit?: number; skillId: string }[] = [];
    const service = createSnapshotsService({
      listSnapshotsPageBySkill: async (input) => {
        calls.push({
          cursor: input.cursor ?? null,
          limit: input.limit,
          skillId: input.skillId,
        });
        return {
          nextCursor: {
            id: "snapshot-2",
            syncTime: 456,
          },
          isDone: false,
          page: [
            {
              archiveR2Key: "snapshots/acme/widget.zip",
              description: "Widget skill snapshot",
              directoryPath: "skills/acme/widget/",
              entryPath: "skills/acme/widget/skill.md",
              hash: "hash-1",
              id: "snapshot-1",
              isDeprecated: false,
              name: "widget",
              skillId: "skill-1",
              sourceCommitDate: 123,
              sourceCommitMessage: "feat: add widget",
              sourceCommitSha: "sha-1",
              sourceCommitUrl: "https://github.com/acme/widget/commit/sha-1",
              syncTime: 123,
              version: "1.0.0",
            },
          ],
        };
      },
    });

    await expect(
      service.listBySkill({
        cursor: encodeCursor({
          id: "snapshot-0",
          syncTime: 100,
        }),
        limit: 10,
        skillId: "skill-1",
      }),
    ).resolves.toEqual({
      continueCursor: encodeCursor({
        id: "snapshot-2",
        syncTime: 456,
      }),
      isDone: false,
      page: [
        {
          archiveR2Key: "snapshots/acme/widget.zip",
          description: "Widget skill snapshot",
          directoryPath: "skills/acme/widget/",
          entryPath: "skills/acme/widget/skill.md",
          hash: "hash-1",
          id: "snapshot-1",
          isDeprecated: false,
          name: "widget",
          skillId: "skill-1",
          sourceCommitDate: 123,
          sourceCommitMessage: "feat: add widget",
          sourceCommitSha: "sha-1",
          sourceCommitUrl: "https://github.com/acme/widget/commit/sha-1",
          syncTime: 123,
          version: "1.0.0",
        },
      ],
    });

    expect(calls).toEqual([
      {
        cursor: {
          id: "snapshot-0",
          syncTime: 100,
        },
        limit: 10,
        skillId: "skill-1",
      },
    ]);
  });

  test("returns the latest snapshot for a skill and version", async () => {
    const calls: { skillId: string; version: string }[] = [];
    const service = createSnapshotsService({
      getSnapshotBySkillAndVersion: async (input) => {
        calls.push(input);
        return {
          archiveR2Key: null,
          description: "Widget skill snapshot",
          directoryPath: "skills/acme/widget/",
          entryPath: "skills/acme/widget/skill.md",
          hash: "hash-1",
          id: "snapshot-1",
          isDeprecated: false,
          name: "widget",
          skillId: "skill-1",
          sourceCommitDate: null,
          sourceCommitMessage: null,
          sourceCommitSha: null,
          sourceCommitUrl: null,
          syncTime: 123,
          version: "1.0.0",
        };
      },
    });

    await expect(
      service.getBySkillAndVersion({
        skillId: "skill-1",
        version: "1.0.0",
      }),
    ).resolves.toEqual({
      archiveR2Key: null,
      description: "Widget skill snapshot",
      directoryPath: "skills/acme/widget/",
      entryPath: "skills/acme/widget/skill.md",
      hash: "hash-1",
      id: "snapshot-1",
      isDeprecated: false,
      name: "widget",
      skillId: "skill-1",
      sourceCommitDate: null,
      sourceCommitMessage: null,
      sourceCommitSha: null,
      sourceCommitUrl: null,
      syncTime: 123,
      version: "1.0.0",
    });
    expect(calls).toEqual([
      {
        skillId: "skill-1",
        version: "1.0.0",
      },
    ]);
  });

  test("returns a download manifest for snapshot files with public urls", async () => {
    const service = createSnapshotsService({
      listSnapshotFiles: async () => [
        {
          contentType: "text/markdown; charset=utf-8",
          fileHash: "hash-1",
          path: "skills/acme/widget/README.md",
          r2Key: "snapshots/acme/widget/README.md",
          size: 12,
          sourceSha: "sha-1",
        },
        {
          contentType: "text/plain; charset=utf-8",
          fileHash: "hash-2",
          path: "skills/acme/widget/NO_URL.md",
          r2Key: null,
          size: 3,
          sourceSha: null,
        },
      ],
    });

    await expect(
      service.getSnapshotDownloadManifest({ snapshotId: "snapshot-1" }),
    ).resolves.toEqual([
      {
        contentType: "text/markdown; charset=utf-8",
        fileHash: "hash-1",
        path: "skills/acme/widget/README.md",
        r2Key: "snapshots/acme/widget/README.md",
        size: 12,
        sourceSha: "sha-1",
      },
    ]);
  });

  test("returns archive download objects when the archive file exists", async () => {
    const service = createSnapshotsService({
      getSnapshotArchiveObject: async (archiveKey) => {
        expect(archiveKey).toBe("snapshots/acme/widget.zip");
        return {
          body: new ReadableStream(),
          httpEtag: "etag-1",
          httpMetadata: {
            contentType: "application/gzip",
          },
          size: 128,
        };
      },
      getSnapshotById: async () => ({
        archiveR2Key: "snapshots/acme/widget.zip",
        description: "Widget skill snapshot",
        directoryPath: "skills/acme/widget/",
        entryPath: "skills/acme/widget/skill.md",
        hash: "hash-1",
        id: "snapshot-1",
        isDeprecated: false,
        name: "widget",
        skillId: "skill-1",
        sourceCommitDate: null,
        sourceCommitMessage: null,
        sourceCommitSha: null,
        sourceCommitUrl: null,
        syncTime: 123,
        version: "1.0.0",
      }),
    });

    await expect(
      service.getSnapshotArchiveDownloadObject({ snapshotId: "snapshot-1" }),
    ).resolves.toMatchObject({
      archiveKey: "snapshots/acme/widget.zip",
      snapshot: {
        id: "snapshot-1",
      },
      object: {
        httpEtag: "etag-1",
        httpMetadata: {
          contentType: "application/gzip",
        },
        size: 128,
      },
    });
  });

  test("resolves file signed urls via the snapshot directory fallback", async () => {
    const calls: { path: string; snapshotId: string }[] = [];
    const service = createSnapshotsService({
      buildSnapshotFilePublicUrl: (key) => `https://cdn.example/${key}`,
      getSnapshotById: async (snapshotId) => {
        expect(snapshotId).toBe(asSnapshotId("snapshot-1"));
        return {
          archiveR2Key: null,
          description: "Widget skill snapshot",
          directoryPath: "skills/acme/widget/",
          entryPath: "skills/acme/widget/skill.md",
          hash: "hash-1",
          id: "snapshot-1",
          isDeprecated: false,
          name: "widget",
          skillId: "skill-1",
          sourceCommitDate: null,
          sourceCommitMessage: null,
          sourceCommitSha: null,
          sourceCommitUrl: null,
          syncTime: 123,
          version: "1.0.0",
        };
      },
      getSnapshotFileByPath: async (input) => {
        calls.push(input);
        return input.path === "README.md"
          ? {
              contentType: "text/markdown; charset=utf-8",
              fileHash: "hash-1",
              path: "README.md",
              r2Key: "snapshots/acme/widget/README.md",
              size: 12,
              sourceSha: "sha-1",
            }
          : null;
      },
    });

    await expect(
      service.getSnapshotFileSignedUrl({
        path: "skills/acme/widget/README.md",
        snapshotId: "snapshot-1",
      }),
    ).resolves.toEqual({
      contentType: "text/markdown; charset=utf-8",
      etag: "hash-1",
      size: 12,
      url: "https://cdn.example/snapshots/acme/widget/README.md",
    });
    expect(calls).toEqual([
      {
        path: "skills/acme/widget/README.md",
        snapshotId: "snapshot-1",
      },
      {
        path: "README.md",
        snapshotId: "snapshot-1",
      },
    ]);
  });

  test("reads snapshot file content from R2 using the requested byte range", async () => {
    const service = createSnapshotsService({
      getSnapshotById: async () => ({
        archiveR2Key: null,
        description: "Widget skill snapshot",
        directoryPath: "skills/acme/widget/",
        entryPath: "skills/acme/widget/skill.md",
        hash: "hash-1",
        id: "snapshot-1",
        isDeprecated: false,
        name: "widget",
        skillId: "skill-1",
        sourceCommitDate: null,
        sourceCommitMessage: null,
        sourceCommitSha: null,
        sourceCommitUrl: null,
        syncTime: 123,
        version: "1.0.0",
      }),
      getSnapshotFileByPath: async (input) =>
        input.path === "guide.md"
          ? {
              contentType: "text/markdown; charset=utf-8",
              fileHash: "hash-1",
              path: "guide.md",
              r2Key: "snapshots/acme/widget/guide.md",
              size: 6,
              sourceSha: "sha-1",
            }
          : null,
      readSnapshotFileObject: async (_key, range) => {
        expect(range).toEqual({
          length: 3,
          offset: 2,
        });
        return {
          arrayBuffer: async () => new TextEncoder().encode("cde").buffer,
          body: new ReadableStream(),
          size: 6,
        };
      },
    });

    await expect(
      service.readSnapshotFileContent({
        maxBytes: 3,
        offset: 2,
        path: "skills/acme/widget/guide.md",
        snapshotId: "snapshot-1",
      }),
    ).resolves.toEqual({
      bytesRead: 3,
      content: "cde",
      isTruncated: true,
      offset: 2,
      totalBytes: 6,
    });
  });

  test("maps snapshot tree entries to blob entries", async () => {
    const service = createSnapshotsService({
      listSnapshotFiles: async () => [
        {
          contentType: null,
          fileHash: "hash-1",
          path: "skills/acme/widget/README.md",
          r2Key: "snapshots/acme/widget/README.md",
          size: 12,
          sourceSha: null,
        },
      ],
    });

    await expect(
      service.getSnapshotTreeEntries({ snapshotId: "snapshot-1" }),
    ).resolves.toEqual([
      {
        path: "skills/acme/widget/README.md",
        type: "blob",
      },
    ]);
  });

  test("enqueues snapshot uploads through the provided scheduler", async () => {
    const calls: { files: { content: string; path: string }[]; snapshotId: string }[] = [];
    const service = createSnapshotsService({
      snapshotUploadScheduler: {
        enqueue: async (input) => {
          calls.push(input);
          return { workId: "workflow-123" };
        },
      },
    });

    await expect(
      service.uploadSnapshotFiles({
        files: [
          {
            content: "hello",
            path: "skills/acme/widget/README.md",
          },
        ],
        snapshotId: "snapshot-1",
      }),
    ).resolves.toEqual({
      workId: "workflow-123",
    });

    expect(calls).toEqual([
      {
        files: [
          {
            content: "hello",
            path: "skills/acme/widget/README.md",
          },
        ],
        snapshotId: "snapshot-1",
      },
    ]);
  });

  test("creates historical snapshots for the next two commits when github history is available", async () => {
    const snapshotCalls: {
      description: string;
      directoryPath: string;
      entryPath: string;
      hash: string;
      name: string;
      skillId: string;
      sourceCommitDate?: number;
      sourceCommitMessage?: string | null;
      sourceCommitSha: string;
      sourceCommitUrl?: string | null;
      syncTime: number;
      version: string;
    }[] = [];
    const uploadCalls: {
      files: { content: string; path: string }[];
      snapshotId: string;
    }[] = [];
    const service = createSnapshotsService({
      buildSkillTreeEntries: (tree) => tree,
      createSnapshot: async (input) => {
        snapshotCalls.push(input);
        return `snapshot-${snapshotCalls.length}`;
      },
      deprecateSnapshotsBeyondLimit: async () => undefined,
      fetchCommitSha: async ({ ref }) => `${ref.padEnd(40, "0")}`.slice(0, 40),
      fetchSkillFilesForRoot: async () => ({
        files: [
          {
            content: "skill content",
            path: "acme/widget/skill.md",
          },
        ],
      }),
      fetchTree: async () => [
        {
          path: "acme/widget/skill.md",
          sha: "tree-sha-1",
          type: "blob",
        },
      ],
      hasGithubToken: () => true,
      getSnapshotBySkillAndCommit: async () => null,
      listSkillsHistoryInfoByIds: async () => [
        {
          directoryPath: "skills/acme/widget",
          entryPath: "skills/acme/widget/skill.md",
          id: "skill-1",
          latestDescription: "Widget skill",
          latestName: "widget",
          latestVersion: "1.2.0",
        },
      ],
      uploadSnapshotFiles: async (input) => {
        uploadCalls.push(input);
        return { workId: "workflow-1" };
      },
    });

    await expect(
      service.createHistoricalSnapshots({
        commits: [
          {
            message: "latest commit",
            sha: "latest",
            url: "https://github.com/acme/widget/commit/latest",
          },
          {
            committedDate: "2024-01-02T00:00:00.000Z",
            message: "feat: add widget",
            sha: "next-one",
            url: "https://github.com/acme/widget/commit/next-one",
          },
          {
            committedDate: "2024-01-01T00:00:00.000Z",
            message: "feat: add widget v2",
            sha: "next-two",
            url: "https://github.com/acme/widget/commit/next-two",
          },
        ],
        repoName: "widget-repo",
        repoOwner: "acme",
        skillIds: ["skill-1"],
      }),
    ).resolves.toBeNull();

    expect(snapshotCalls).toEqual([
      {
        description: "Widget skill",
        directoryPath: "skills/acme/widget/",
        entryPath: "skills/acme/widget/skill.md",
        hash: "f673b3a57705b4279e1deb5f59f3e0012c5097bbe84f3bda0509d4bf2c5d1c35",
        name: "widget",
        skillId: "skill-1",
        sourceCommitDate: Date.parse("2024-01-02T00:00:00.000Z"),
        sourceCommitMessage: "feat: add widget",
        sourceCommitSha: "next-one00000000000000000000000000000000",
        sourceCommitUrl: "https://github.com/acme/widget/commit/next-one",
        syncTime: Date.parse("2024-01-02T00:00:00.000Z"),
        version: "1.1.0",
      },
      {
        description: "Widget skill",
        directoryPath: "skills/acme/widget/",
        entryPath: "skills/acme/widget/skill.md",
        hash: "f673b3a57705b4279e1deb5f59f3e0012c5097bbe84f3bda0509d4bf2c5d1c35",
        name: "widget",
        skillId: "skill-1",
        sourceCommitDate: Date.parse("2024-01-01T00:00:00.000Z"),
        sourceCommitMessage: "feat: add widget v2",
        sourceCommitSha: "next-two00000000000000000000000000000000",
        sourceCommitUrl: "https://github.com/acme/widget/commit/next-two",
        syncTime: Date.parse("2024-01-01T00:00:00.000Z"),
        version: "1.0.0",
      },
    ]);

    expect(uploadCalls).toEqual([
      {
        files: [
          {
            content: "skill content",
            path: "skills/acme/widget/skill.md",
          },
        ],
        snapshotId: "snapshot-1",
      },
      {
        files: [
          {
            content: "skill content",
            path: "skills/acme/widget/skill.md",
          },
        ],
        snapshotId: "snapshot-2",
      },
    ]);
  });

  test("creates archive staging from snapshot files", async () => {
    const archiveBuffer = new TextEncoder().encode("archive-bytes");
    const createSnapshotArchiveBufferCalls: Array<
      {
        body: Uint8Array;
        header: { name: string; size: number; type: "file" };
      }[]
    > = [];
    const putCalls: Array<{
      body: Uint8Array;
      contentType?: string;
      key: string;
    }> = [];

    const service = createSnapshotsService({
      createSnapshotArchiveBuffer: async (entries) => {
        createSnapshotArchiveBufferCalls.push(entries);
        return archiveBuffer;
      },
      getSnapshotById: async () => ({
        archiveR2Key: null,
        description: "Widget skill snapshot",
        directoryPath: "skills/acme/widget/",
        entryPath: "skills/acme/widget/skill.md",
        hash: "hash-1",
        id: "snapshot-1",
        isDeprecated: false,
        name: "widget",
        skillId: "skill-1",
        sourceCommitDate: null,
        sourceCommitMessage: null,
        sourceCommitSha: null,
        sourceCommitUrl: null,
        syncTime: 123,
        version: "1.0.0",
      }),
      getSnapshotStorageContext: async () => ({
        directoryPath: "skills/acme/widget/",
        repoName: "widget-repo",
        repoOwner: "acme",
        snapshotId: "snapshot-1" as never,
        version: "1.0.0",
      }),
      listSnapshotFiles: async () => [
        {
          contentType: "text/markdown; charset=utf-8",
          fileHash: "hash-1",
          path: "skills/acme/widget/README.md",
          r2Key: "snapshots/acme/widget/README.md",
          size: 12,
          sourceSha: "sha-1",
        },
      ],
      putSnapshotArchiveStagingObject: async (key, body, contentType) => {
        putCalls.push({
          body: body as Uint8Array,
          contentType,
          key,
        });
      },
      readSnapshotFileObject: async (key) => ({
        arrayBuffer: async () => new TextEncoder().encode(`bytes:${key}`).buffer,
        body: new ReadableStream(),
        size: 12,
      }),
    });

    await expect(
      service.createSnapshotArchiveStaging({
        snapshotId: "snapshot-1",
      }),
    ).resolves.toMatchObject({
      archiveBytes: archiveBuffer.byteLength,
      archiveKey: "archives/acme/widget-repo/skills/acme/widget/1.0.0/skills.tar.gz",
      filesCount: 1,
      snapshotId: "snapshot-1",
    });

    expect(createSnapshotArchiveBufferCalls).toEqual([
      [
        {
          body: new TextEncoder().encode("bytes:snapshots/acme/widget/README.md"),
          header: {
            name: "README.md",
            size: new TextEncoder().encode("bytes:snapshots/acme/widget/README.md").byteLength,
            type: "file",
          },
        },
      ],
    ]);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0]).toMatchObject({
      contentType: "application/gzip",
      key: expect.stringMatching(/^snapshot-archive\/staging\//),
    });
    expect(putCalls[0]?.body).toEqual(archiveBuffer);
  });

  test("uploads archive staging objects into the archive bucket", async () => {
    const archiveBuffer = new TextEncoder().encode("archive-bytes");
    const stagingCalls: string[] = [];
    const archiveCalls: Array<{
      body: Uint8Array;
      contentType?: string;
      key: string;
    }> = [];
    const setCalls: Array<{ archiveR2Key: string; snapshotId: string }> = [];

    const service = createSnapshotsService({
      getSnapshotArchiveStagingObject: async (key) => {
        stagingCalls.push(key);
        return {
          arrayBuffer: async () => archiveBuffer.buffer,
          body: new ReadableStream(),
          size: archiveBuffer.byteLength,
        };
      },
      putSnapshotArchiveObject: async (key, body, contentType) => {
        archiveCalls.push({
          body: body as Uint8Array,
          contentType,
          key,
        });
      },
      setSnapshotArchiveR2Key: async (input) => {
        setCalls.push(input);
      },
    });

    await expect(
      service.uploadSnapshotArchiveFromStaging({
        archiveBytes: 0,
        archiveKey: "archives/acme/widget/skills.tar.gz",
        filesCount: 1,
        snapshotId: "snapshot-1",
        stagingKey: "snapshot-archive/staging/2024-01-01/abc.tar.gz",
      }),
    ).resolves.toEqual({
      archiveBytes: archiveBuffer.byteLength,
      archiveKey: "archives/acme/widget/skills.tar.gz",
      filesCount: 1,
      snapshotId: "snapshot-1",
    });

    expect(stagingCalls).toEqual([
      "snapshot-archive/staging/2024-01-01/abc.tar.gz",
    ]);
    expect(archiveCalls).toEqual([
      {
        body: archiveBuffer,
        contentType: "application/gzip",
        key: "archives/acme/widget/skills.tar.gz",
      },
    ]);
    expect(setCalls).toEqual([
      {
        archiveR2Key: "archives/acme/widget/skills.tar.gz",
        snapshotId: "snapshot-1",
      },
    ]);
  });
});
