/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createGithubFetchRuntime } from "./github-fetch";

const encodeBase64 = (value: string) =>
  typeof btoa === "function" ? btoa(value) : Buffer.from(value, "utf-8").toString("base64");

describe("createGithubFetchRuntime", () => {
  test("fetches repo metadata and skill previews from github api responses", async () => {
    const runtime = createGithubFetchRuntime(
      {
        GH_PAT: "test-token",
        GITHUB_TOKEN: "",
      },
      {
        fetch: (async (input: string) => {
          if (input.endsWith("/repos/acme/skills")) {
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

          if (input.includes("/repos/acme/skills/commits?per_page=2")) {
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

          if (input.includes("/repos/acme/skills/git/trees/abc123?recursive=1")) {
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

          if (input.includes("/repos/acme/skills/git/blobs/blob-1")) {
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
  });

  test("rejects invalid github urls", async () => {
    const runtime = createGithubFetchRuntime({
      GH_PAT: "",
      GITHUB_TOKEN: "",
    });

    await expect(
      runtime.fetchRepo({
        githubUrl: "https://example.com/acme/skills",
      }),
    ).rejects.toThrow("Invalid GitHub repository URL.");
  });
});
