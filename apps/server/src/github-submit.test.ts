/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createGithubSubmitRuntime } from "./github-submit";

const encodeBase64 = (value: string) =>
  typeof btoa === "function" ? btoa(value) : Buffer.from(value, "utf-8").toString("base64");

const getRequestUrl = (input: string | URL | Request) => {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof Request) {
    return input.url;
  }

  return input.toString();
};

describe("createGithubSubmitRuntime", () => {
  test("builds a prepared upload payload from github api responses", async () => {
    const requests: Request[] = [];
    const runtime = createGithubSubmitRuntime(
      {
        GH_PAT: "test-token",
      },
      {
        fetch: (async (input: string | URL | Request, init?: RequestInit) => {
          const request = new Request(getRequestUrl(input), init);
          requests.push(request);

          if (request.url.endsWith("/repos/acme/skills")) {
            return await Promise.resolve(
              Response.json(
                {
                  archived: false,
                  default_branch: "main",
                  disabled: false,
                  fork: false,
                  forks_count: 1,
                  full_name: "acme/skills",
                  license: { name: "MIT" },
                  owner: {
                    avatar_url: null,
                    login: "acme",
                    name: "Acme",
                  },
                  private: false,
                  stargazers_count: 2,
                  updated_at: "2024-01-01T00:00:00.000Z",
                  created_at: "2023-01-01T00:00:00.000Z",
                },
                { status: 200 },
              ),
            );
          }

          if (request.url.includes("/repos/acme/skills/commits?per_page=2")) {
            return await Promise.resolve(
              Response.json(
                [
                  {
                    commit: {
                      author: { date: "2024-01-02T00:00:00.000Z" },
                      committer: { date: "2024-01-02T00:00:00.000Z" },
                      message: "initial commit",
                    },
                    html_url: "https://github.com/acme/skills/commit/abc123",
                    sha: "abc123",
                  },
                ],
                { status: 200 },
              ),
            );
          }

          if (request.url.includes("/repos/acme/skills/git/trees/abc123?recursive=1")) {
            return await Promise.resolve(
              Response.json(
                {
                  tree: [
                    {
                      path: "skills/example/skill.md",
                      sha: "blob-1",
                      type: "blob",
                    },
                  ],
                },
                { status: 200 },
              ),
            );
          }

          if (request.url.includes("/repos/acme/skills/git/blobs/blob-1")) {
            return await Promise.resolve(
              Response.json(
                {
                  content: encodeBase64(
                    `---\nname: example-skill\ndescription: Example skill\n---\n# Example`,
                  ),
                  encoding: "base64",
                },
                { status: 200 },
              ),
            );
          }

          return new Response("not found", { status: 404 });
        }) as typeof fetch,
      },
    );

    await expect(
      runtime.buildPayload({
        owner: "acme",
        repo: "skills",
      }),
    ).resolves.toEqual({
      payload: {
        recentCommits: [
          {
            committedDate: "2024-01-02T00:00:00.000Z",
            message: "initial commit",
            sha: "abc123",
            url: "https://github.com/acme/skills/commit/abc123",
          },
        ],
        repo: {
          createdAt: 1_672_531_200_000,
          defaultBranch: "main",
          forks: 1,
          license: "MIT",
          nameWithOwner: "acme/skills",
          owner: {
            avatarUrl: undefined,
            handle: "acme",
            name: "Acme",
          },
          stars: 2,
          updatedAt: 1_704_067_200_000,
        },
        skills: [
          {
            description: "Example skill",
            directoryPath: "skills/example/",
            entryPath: "skills/example/skill.md",
            initialSnapshot: {
              files: [
                {
                  content: `---\nname: example-skill\ndescription: Example skill\n---\n# Example`,
                  path: "skill.md",
                },
              ],
              sourceCommitDate: 1_704_153_600_000,
              sourceCommitMessage: "initial commit",
              sourceCommitSha: "abc123",
              sourceCommitUrl: "https://github.com/acme/skills/commit/abc123",
              sourceRef: "main",
              tree: [
                {
                  path: "skill.md",
                  sha: "blob-1",
                  size: undefined,
                  type: "blob",
                },
              ],
            },
            license: "MIT",
            slug: "example-skill",
            sourceLocator: "github:acme/skills/skills/example/skill.md",
            sourceType: "github",
            title: "example-skill",
          },
        ],
      },
      reason: undefined,
    });
    expect(requests.length).toBeGreaterThan(0);
    expect(
      requests.every((request) => request.headers.get("authorization") === "Bearer test-token"),
    ).toBe(true);
  });
});
