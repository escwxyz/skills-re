// oxlint-disable require-await
/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createSkillArchiveDownloadResponse } from "./skills-download";

describe("createSkillArchiveDownloadResponse", () => {
  test("returns an attachment response for an existing snapshot archive", async () => {
    const recorded: { skillId: string; version: string }[] = [];
    const response = await createSkillArchiveDownloadResponse(
      {
        skillId: "skill-1",
        version: "1.0.0",
      },
      {
        getBySkillAndVersion: async () => ({
          archiveR2Key: "archives/acme/widget/skills.tar.gz",
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
        getSnapshotArchiveDownloadObject: async () => ({
          archiveKey: "archives/acme/widget/skills.tar.gz",
          object: {
            body: new TextEncoder().encode("archive-bytes"),
            httpEtag: "etag-1",
            httpMetadata: {
              contentType: "application/gzip",
            },
            size: 13,
          },
          snapshot: {
            archiveR2Key: "archives/acme/widget/skills.tar.gz",
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
          },
        }),
        recordSuccessfulSkillDownload: async (input) => {
          recorded.push(input);
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="widget-v1.0.0.tar.gz"',
    );
    expect(response.headers.get("content-type")).toBe("application/gzip");
    expect(response.headers.get("etag")).toBe("etag-1");
    expect(response.text()).resolves.toBe("archive-bytes");
    expect(recorded).toEqual([
      {
        skillId: "skill-1",
        version: "1.0.0",
      },
    ]);
  });

  test("returns a 404 when the snapshot archive is missing", async () => {
    const response = await createSkillArchiveDownloadResponse(
      {
        skillId: "skill-1",
        version: "1.0.0",
      },
      {
        getBySkillAndVersion: async () => ({
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
        getSnapshotArchiveDownloadObject: async () => null,
        // recordSuccessfulSkillDownload: async () => undefined,
      },
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Snapshot archive not found.");
  });
});
