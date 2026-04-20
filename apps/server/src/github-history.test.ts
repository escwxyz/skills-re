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
