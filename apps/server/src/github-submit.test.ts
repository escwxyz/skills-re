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
  test("deduplicates claude plugin copies when building the upload payload", async () => {
    const runtime = createGithubSubmitRuntime(
      {
        GH_PAT: "test-token",
      },
      {
        fetch: (async (input: string | URL | Request, init?: RequestInit) => {
          const request = new Request(getRequestUrl(input), init);

          if (request.url.endsWith("/repos/acme/caveman")) {
            return await Promise.resolve(
              Response.json(
                {
                  archived: false,
                  default_branch: "main",
                  disabled: false,
                  fork: false,
                  forks_count: 1,
                  full_name: "acme/caveman",
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

          if (request.url.includes("/repos/acme/caveman/commits?per_page=2")) {
            return await Promise.resolve(
              Response.json(
                [
                  {
                    commit: {
                      author: { date: "2024-01-02T00:00:00.000Z" },
                      committer: { date: "2024-01-02T00:00:00.000Z" },
                      message: "initial commit",
                    },
                    html_url: "https://github.com/acme/caveman/commit/abc123",
                    sha: "abc123",
                  },
                ],
                { status: 200 },
              ),
            );
          }

          if (request.url.includes("/repos/acme/caveman/git/trees/abc123?recursive=1")) {
            return await Promise.resolve(
              Response.json(
                {
                  tree: [
                    {
                      path: "plugins/caveman/skills/cavecrew/SKILL.md",
                      sha: "blob-plugin",
                      type: "blob",
                    },
                    {
                      path: "skills/cavecrew/SKILL.md",
                      sha: "blob-default",
                      type: "blob",
                    },
                  ],
                },
                { status: 200 },
              ),
            );
          }

          if (
            request.url.includes("/repos/acme/caveman/git/blobs/blob-plugin") ||
            request.url.includes("/repos/acme/caveman/git/blobs/blob-default")
          ) {
            return await Promise.resolve(
              Response.json(
                {
                  content: encodeBase64(
                    `---\nname: cavecrew\ndescription: Cave crew workflow\n---\n# Cavecrew`,
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
        repo: "caveman",
      }),
    ).resolves.toMatchObject({
      payload: {
        skills: [
          {
            directoryPath: "skills/cavecrew/",
            entryPath: "skills/cavecrew/SKILL.md",
            slug: "cavecrew",
            sourceLocator: "github:acme/caveman/skills/cavecrew/SKILL.md",
          },
        ],
      },
      reason: undefined,
    });
  });

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
                      path: "skills/example/SKILL.md",
                      sha: "blob-1",
                      type: "blob",
                    },
                    {
                      path: "skills/.vendor/SKILL.md",
                      sha: "blob-hidden",
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
            entryPath: "skills/example/SKILL.md",
            frontmatterHash: expect.any(String),
            initialSnapshot: {
              files: [
                {
                  content: `---\nname: example-skill\ndescription: Example skill\n---\n# Example`,
                  path: "SKILL.md",
                },
              ],
              sourceCommitDate: 1_704_153_600_000,
              sourceCommitMessage: "initial commit",
              sourceCommitSha: "abc123",
              sourceCommitUrl: "https://github.com/acme/skills/commit/abc123",
              sourceRef: "main",
              tree: [
                {
                  path: "SKILL.md",
                  sha: "blob-1",
                  size: undefined,
                  type: "blob",
                },
              ],
            },
            license: "MIT",
            slug: "example-skill",
            sourceLocator: "github:acme/skills/skills/example/SKILL.md",
            sourceType: "github",
            skillContentHash: expect.any(String),
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

  test("uses skill frontmatter license for repo payload when github has no license", async () => {
    const runtime = createGithubSubmitRuntime(
      {
        GH_PAT: "test-token",
      },
      {
        fetch: (async (input: string | URL | Request, init?: RequestInit) => {
          const request = new Request(getRequestUrl(input), init);

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
                  license: null,
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
                      path: "skills/example/SKILL.md",
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
                    `---\nname: example-skill\ndescription: Example skill\nlicense: MIT\n---\n# Example`,
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
    ).resolves.toMatchObject({
      payload: {
        repo: {
          license: "MIT",
        },
        skills: [
          {
            license: "MIT",
          },
        ],
      },
      reason: undefined,
    });
  });

  test("supports a root SKILL.md file when building the upload payload", async () => {
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
                      path: "SKILL.md",
                      sha: "blob-root",
                      type: "blob",
                    },
                  ],
                },
                { status: 200 },
              ),
            );
          }

          if (request.url.includes("/repos/acme/skills/git/blobs/blob-root")) {
            return await Promise.resolve(
              Response.json(
                {
                  content: encodeBase64(
                    `---\nname: root-skill\ndescription: Root skill\n---\n# Root`,
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
    ).resolves.toMatchObject({
      payload: {
        skills: [
          {
            directoryPath: "",
            entryPath: "SKILL.md",
            slug: "root-skill",
            sourceLocator: "github:acme/skills/SKILL.md",
            title: "root-skill",
          },
        ],
      },
      reason: undefined,
    });

    expect(requests.length).toBeGreaterThan(0);
  });

  test("builds upload skill descriptions from a leading markdown metadata table", async () => {
    const skillMd = `| name | caveman |
| --- | --- |
| description | Ultra-compressed communication mode. Cuts token usage ~75%. |

Respond terse like smart caveman.`;
    const runtime = createGithubSubmitRuntime(
      {
        GH_PAT: "test-token",
      },
      {
        fetch: (async (input: string | URL | Request, init?: RequestInit) => {
          const request = new Request(getRequestUrl(input), init);

          if (request.url.endsWith("/repos/acme/caveman")) {
            return await Promise.resolve(
              Response.json(
                {
                  archived: false,
                  default_branch: "main",
                  disabled: false,
                  fork: false,
                  forks_count: 1,
                  full_name: "acme/caveman",
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

          if (request.url.includes("/repos/acme/caveman/commits?per_page=2")) {
            return await Promise.resolve(
              Response.json(
                [
                  {
                    commit: {
                      author: { date: "2024-01-02T00:00:00.000Z" },
                      committer: { date: "2024-01-02T00:00:00.000Z" },
                      message: "initial commit",
                    },
                    html_url: "https://github.com/acme/caveman/commit/abc123",
                    sha: "abc123",
                  },
                ],
                { status: 200 },
              ),
            );
          }

          if (request.url.includes("/repos/acme/caveman/git/trees/abc123?recursive=1")) {
            return await Promise.resolve(
              Response.json(
                {
                  tree: [
                    {
                      path: "skills/caveman/SKILL.md",
                      sha: "blob-caveman",
                      type: "blob",
                    },
                  ],
                },
                { status: 200 },
              ),
            );
          }

          if (request.url.includes("/repos/acme/caveman/git/blobs/blob-caveman")) {
            return await Promise.resolve(
              Response.json(
                {
                  content: encodeBase64(skillMd),
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
        repo: "caveman",
      }),
    ).resolves.toMatchObject({
      payload: {
        skills: [
          {
            description: "Ultra-compressed communication mode. Cuts token usage ~75%.",
            slug: "caveman",
            title: "caveman",
          },
        ],
      },
      reason: undefined,
    });
  });
});
