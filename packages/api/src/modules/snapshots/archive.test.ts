/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { buildSnapshotArchiveTarEntries, createSnapshotArchiveBuffer } from "./archive";

describe("snapshots archive helpers", () => {
  test("builds tar entries relative to the snapshot directory", () => {
    expect(
      buildSnapshotArchiveTarEntries({
        directoryPath: "skills/acme/widget/",
        files: [
          {
            content: new TextEncoder().encode("hello"),
            path: "skills/acme/widget/README.md",
          },
          {
            content: new TextEncoder().encode("guide"),
            path: "skills/acme/widget/docs/guide.md",
          },
        ],
      }),
    ).toEqual([
      {
        body: new TextEncoder().encode("hello"),
        header: {
          name: "README.md",
          size: 5,
          type: "file",
        },
      },
      {
        body: new TextEncoder().encode("guide"),
        header: {
          name: "docs/guide.md",
          size: 5,
          type: "file",
        },
      },
    ]);
  });

  test("rejects file paths outside the snapshot directory", () => {
    expect(() =>
      buildSnapshotArchiveTarEntries({
        directoryPath: "skills/acme/widget/",
        files: [
          {
            content: new TextEncoder().encode("hello"),
            path: "SKILL.md",
          },
        ],
      }),
    ).toThrow("File path must live under the snapshot directory: SKILL.md");
  });

  test("rejects rooted file paths outside the snapshot directory", () => {
    expect(() =>
      buildSnapshotArchiveTarEntries({
        directoryPath: "skills/acme/widget/",
        files: [
          {
            content: new TextEncoder().encode("hello"),
            path: "skills/acme/other/skill.md",
          },
        ],
      }),
    ).toThrow("File path must live under the snapshot directory: skills/acme/other/skill.md");
  });

  test("packs and gzips archive entries", async () => {
    const packCalls: unknown[] = [];
    const archive = await createSnapshotArchiveBuffer(
      [
        {
          body: new TextEncoder().encode("hello"),
          header: {
            name: "README.md",
            size: 5,
            type: "file",
          },
        },
      ],
      {
        createGzipEncoder: () =>
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              controller.enqueue(chunk);
            },
          }),
        // oxlint-disable-next-line require-await
        packTar: async (entries) => {
          packCalls.push(entries);
          return new TextEncoder().encode("tar-bytes");
        },
      },
    );

    expect(packCalls).toEqual([
      [
        {
          body: new TextEncoder().encode("hello"),
          header: {
            name: "README.md",
            size: 5,
            type: "file",
          },
        },
      ],
    ]);
    expect(archive).toEqual(new TextEncoder().encode("tar-bytes"));
  });
});
