/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createGithubFetchRuntime } from "./github-fetch";

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

describe("createGithubFetchRuntime", () => {
  test("fetches multiple skill roots concurrently while preserving order", async () => {
    interface DeferredResponse {
      promise: Promise<Response>;
      resolve: (response: Response) => void;
    }

    const startedBlobUrls: string[] = [];
    const requests: Request[] = [];
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

    const runtime = createGithubFetchRuntime(
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
                  default_branch: "main",
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
                      path: "skills/alpha/skill.md",
                      sha: "blob-a",
                      type: "blob",
                    },
                    {
                      path: "skills/beta/skill.md",
                      sha: "blob-b",
                      type: "blob",
                    },
                  ],
                },
                { status: 200 },
              ),
            );
          }

          if (request.url.includes("/repos/acme/skills/git/blobs/blob-a")) {
            startedBlobUrls.push(request.url);
            return await getDeferredResponse(request.url).promise;
          }

          if (request.url.includes("/repos/acme/skills/git/blobs/blob-b")) {
            startedBlobUrls.push(request.url);
            return await getDeferredResponse(request.url).promise;
          }

          return new Response("not found", { status: 404 });
        }) as typeof fetch,
      },
    );

    const fetchPromise = runtime.fetchRepo({
      githubUrl: "https://github.com/acme/skills",
    });

    for (let index = 0; index < 20 && startedBlobUrls.length < 2; index += 1) {
      await Promise.resolve();
    }

    expect(startedBlobUrls).toHaveLength(2);
    const [firstBlobUrl, secondBlobUrl] = startedBlobUrls;
    if (!firstBlobUrl || !secondBlobUrl) {
      throw new Error("Expected both blob fetches to start.");
    }
    expect(firstBlobUrl).toContain("blob-a");
    expect(secondBlobUrl).toContain("blob-b");
    expect(requests.length).toBeGreaterThan(0);
    expect(
      requests.every((request) => request.headers.get("authorization") === "Bearer test-token"),
    ).toBe(true);

    deferredResponses.get(secondBlobUrl)?.resolve(
      Response.json(
        {
          content: encodeBase64(`---\nname: beta-skill\ndescription: Beta skill\n---\n# Beta`),
          encoding: "base64",
        },
        { status: 200 },
      ),
    );
    deferredResponses.get(firstBlobUrl)?.resolve(
      Response.json(
        {
          content: encodeBase64(`---\nname: alpha-skill\ndescription: Alpha skill\n---\n# Alpha`),
          encoding: "base64",
        },
        { status: 200 },
      ),
    );

    await expect(fetchPromise).resolves.toMatchObject({
      invalidSkills: [],
      skills: [
        {
          skillMdPath: "skills/alpha/skill.md",
          skillRootPath: "skills/alpha",
          skillTitle: "alpha-skill",
        },
        {
          skillMdPath: "skills/beta/skill.md",
          skillRootPath: "skills/beta",
          skillTitle: "beta-skill",
        },
      ],
    });
  });

  test("fetches repo metadata and skill previews from github api responses", async () => {
    const requests: Request[] = [];
    const runtime = createGithubFetchRuntime(
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
                  default_branch: "main",
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
      runtime.fetchRepo({
        githubUrl: "https://github.com/acme/skills",
      }),
    ).resolves.toEqual({
      branch: "main",
      commitDate: "2024-01-02T00:00:00.000Z",
      commitMessage: "initial commit",
      commitSha: "abc123",
      forkCount: 1,
      invalidSkills: [],
      licenseInfo: {
        name: "MIT",
      },
      nameWithOwner: "acme/skills",
      owner: "acme",
      ownerAvatarUrl: null,
      ownerHandle: "acme",
      ownerName: "Acme",
      recentCommits: [
        {
          committedDate: "2024-01-02T00:00:00.000Z",
          message: "initial commit",
          sha: "abc123",
          url: "https://github.com/acme/skills/commit/abc123",
        },
      ],
      repo: "skills",
      repoCreatedAt: "2023-01-01T00:00:00.000Z",
      repoUpdatedAt: "2024-01-01T00:00:00.000Z",
      repoUrl: null,
      requestedSkillPath: null,
      skills: [
        {
          files: [
            {
              content: `---\nname: example-skill\ndescription: Example skill\n---\n# Example`,
              path: "skill.md",
            },
          ],
          frontmatter: {
            description: "Example skill",
            name: "example-skill",
          },
          skillDescription: "Example skill",
          skillMdContent: `---\nname: example-skill\ndescription: Example skill\n---\n# Example`,
          skillMdPath: "skills/example/skill.md",
          skillRootPath: "skills/example",
          skillTitle: "example-skill",
        },
      ],
      stargazerCount: 2,
      tree: [
        {
          path: "skills/example/skill.md",
          sha: "blob-1",
          type: "blob",
        },
      ],
    });
    expect(requests.length).toBeGreaterThan(0);
    expect(
      requests.every((request) => request.headers.get("authorization") === "Bearer test-token"),
    ).toBe(true);
  });

  test("rejects invalid github urls", () => {
    const runtime = createGithubFetchRuntime({
      GH_PAT: "",
    });

    expect(
      runtime.fetchRepo({
        githubUrl: "https://example.com/acme/skills",
      }),
    ).rejects.toThrow("Invalid GitHub repository URL.");
  });
});
