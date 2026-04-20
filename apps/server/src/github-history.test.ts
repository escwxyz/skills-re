/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createGithubSnapshotHistoryHelpers } from "./github-history";

const encodeUtf8Base64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }

  return btoa(binary);
};

describe("createGithubSnapshotHistoryHelpers", () => {
  test("excludes nested ignored segments", () => {
    const helpers = createGithubSnapshotHistoryHelpers({});

    expect(
      helpers.buildSkillTreeEntries(
        [
          {
            path: "skills/examples/node_modules/pkg.js",
            sha: "sha-1",
            type: "blob",
          },
          {
            path: "skills/src/.next/cache/index.js",
            sha: "sha-2",
            type: "blob",
          },
          {
            path: "skills/src/keep/skill.md",
            sha: "sha-3",
            type: "blob",
          },
        ],
        "skills",
      ),
    ).toEqual([
      {
        path: "src/keep/skill.md",
        sha: "sha-3",
        type: "blob",
      },
    ]);
  });

  test("decodes utf-8 blob content without Buffer", async () => {
    const globalScope = globalThis as typeof globalThis & {
      Buffer?: typeof Buffer;
    };
    const originalBuffer = globalScope.Buffer;
    globalScope.Buffer = undefined as unknown as typeof Buffer;

    try {
      const helpers = createGithubSnapshotHistoryHelpers(
        {},
        {
          fetch: (() =>
            Promise.resolve(
              Response.json(
                {
                  content: encodeUtf8Base64("emoji 😀 and こんにちは"),
                  encoding: "base64",
                },
                { status: 200 },
              ),
            )) as unknown as typeof fetch,
        },
      );

      await expect(
        helpers.fetchSkillFilesForRoot({
          owner: "acme",
          repo: "skills",
          skillRootPath: "skills",
          tree: [
            {
              path: "skills/demo/skill.md",
              sha: "blob-1",
              type: "blob",
            },
          ],
        }),
      ).resolves.toEqual({
        files: [
          {
            content: "emoji 😀 and こんにちは",
            path: "demo/skill.md",
          },
        ],
      });
    } finally {
      globalScope.Buffer = originalBuffer as unknown as typeof Buffer;
    }
  });
});
