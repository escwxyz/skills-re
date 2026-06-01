/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { restoreSnapshotWorkspace, toWorkspaceRelativePath } from "./workspace";

describe("skill eval sandbox workspace restore", () => {
  test("strips the skill directory and restores snapshot files into workspace", async () => {
    const writes: { content: Uint8Array | ArrayBuffer | ReadableStream; path: string }[] = [];
    const mkdirs: string[] = [];

    const result = await restoreSnapshotWorkspace({
      directoryPath: "skills/acme/csv/",
      files: [
        {
          path: "skills/acme/csv/skill.md",
          r2Key: "snapshots/skill.md",
          size: 12,
        },
        {
          path: "skills/acme/csv/evals/files/sales.csv",
          r2Key: "snapshots/sales.csv",
          size: 24,
        },
      ],
      sandbox: {
        mkdir: (path) => {
          mkdirs.push(path);
          return Promise.resolve();
        },
        writeFile: (path, content) => {
          writes.push({ content, path });
          return Promise.resolve();
        },
      },
      storage: {
        getSnapshotFileObject: (key) =>
          Promise.resolve({
            arrayBuffer: () => Promise.resolve(new TextEncoder().encode(key).buffer),
            body: null,
          }),
      },
    });

    expect(mkdirs).toEqual(["/workspace", "/workspace", "/workspace/evals/files"]);
    expect(writes.map((write) => write.path)).toEqual([
      "/workspace/skill.md",
      "/workspace/evals/files/sales.csv",
    ]);
    expect(result.restored).toEqual([
      {
        path: "/workspace/skill.md",
        size: 12,
      },
      {
        path: "/workspace/evals/files/sales.csv",
        size: 24,
      },
    ]);
  });

  test("rejects snapshot files outside the skill directory", () => {
    expect(() => toWorkspaceRelativePath("skills/acme/csv/", "skills/acme/other/skill.md")).toThrow(
      "outside the skill directory",
    );
  });

  test("rejects traversal paths", () => {
    expect(() => toWorkspaceRelativePath("", "../secret.txt")).toThrow("escapes workspace");
  });

  test("fails when a referenced R2 object is missing", async () => {
    await expect(
      restoreSnapshotWorkspace({
        directoryPath: "",
        files: [
          {
            path: "skill.md",
            r2Key: "missing",
            size: 1,
          },
        ],
        sandbox: {
          mkdir: () => Promise.resolve(),
          writeFile: () => Promise.resolve(),
        },
        storage: {
          getSnapshotFileObject: () => Promise.resolve(null),
        },
      }),
    ).rejects.toThrow("Snapshot file object is missing: skill.md");
  });
});
