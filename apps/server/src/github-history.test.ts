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

const getRequestUrl = (input: string | URL | Request) => {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof Request) {
    return input.url;
  }

  return input.toString();
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

  test("bounds concurrent blob fetches per skill root", async () => {
    interface DeferredResponse {
      promise: Promise<Response>;
      resolve: (response: Response) => void;
    }

    const startedBlobUrls: string[] = [];
    const deferredResponses = new Map<string, DeferredResponse>();
    const getDeferredResponse = (input: string) => {
      const existing = deferredResponses.get(input);
      if (existing) {
        return existing;
      }

      const { promise, resolve } = Promise.withResolvers<Response>();
      const deferred = {
        promise,
        resolve,
      };
      deferredResponses.set(input, deferred);
      return deferred;
    };

    const helpers = createGithubSnapshotHistoryHelpers(
      {},
      {
        fetch: (async (input: string | URL | Request, init?: RequestInit) => {
          const request = new Request(getRequestUrl(input), init);

          if (request.url.includes("/repos/acme/skills/git/blobs/")) {
            startedBlobUrls.push(request.url);
            return await getDeferredResponse(request.url).promise;
          }

          return new Response("not found", { status: 404 });
        }) as unknown as typeof fetch,
      },
    );

    const fetchPromise = helpers.fetchSkillFilesForRoot({
      owner: "acme",
      repo: "skills",
      skillRootPath: "skills",
      tree: [
        {
          path: "skills/one/skill.md",
          sha: "blob-1",
          type: "blob",
        },
        {
          path: "skills/two/skill.md",
          sha: "blob-2",
          type: "blob",
        },
        {
          path: "skills/three/skill.md",
          sha: "blob-3",
          type: "blob",
        },
        {
          path: "skills/four/skill.md",
          sha: "blob-4",
          type: "blob",
        },
        {
          path: "skills/five/skill.md",
          sha: "blob-5",
          type: "blob",
        },
      ],
    });

    for (let index = 0; index < 20 && startedBlobUrls.length < 4; index += 1) {
      await Promise.resolve();
    }

    expect(startedBlobUrls).toHaveLength(4);

    deferredResponses.get(startedBlobUrls[0] ?? "")?.resolve(
      Response.json(
        {
          content: encodeUtf8Base64("---\nname: one\ndescription: one\n---\n# one"),
          encoding: "base64",
        },
        { status: 200 },
      ),
    );

    for (let index = 0; index < 20 && startedBlobUrls.length < 5; index += 1) {
      await Promise.resolve();
    }

    expect(startedBlobUrls).toHaveLength(5);

    for (const blobUrl of startedBlobUrls.slice(1)) {
      deferredResponses.get(blobUrl)?.resolve(
        Response.json(
          {
            content: encodeUtf8Base64("---\nname: skill\ndescription: skill\n---\n# skill"),
            encoding: "base64",
          },
          { status: 200 },
        ),
      );
    }

    await expect(fetchPromise).resolves.toEqual({
      files: [
        {
          content: "---\nname: one\ndescription: one\n---\n# one",
          path: "one/skill.md",
        },
        {
          content: "---\nname: skill\ndescription: skill\n---\n# skill",
          path: "two/skill.md",
        },
        {
          content: "---\nname: skill\ndescription: skill\n---\n# skill",
          path: "three/skill.md",
        },
        {
          content: "---\nname: skill\ndescription: skill\n---\n# skill",
          path: "four/skill.md",
        },
        {
          content: "---\nname: skill\ndescription: skill\n---\n# skill",
          path: "five/skill.md",
        },
      ],
    });
  });
});
