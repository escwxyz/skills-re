/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { fetchGithubRepoInputSchema, fetchGithubRepoOutputSchema } from "./common/github";
import { githubContract } from "./github";

describe("github contract", () => {
  test("accepts repo fetch input and output payloads", () => {
    expect(
      fetchGithubRepoInputSchema.parse({
        githubUrl: "https://github.com/acme/skills",
      }),
    ).toEqual({
      githubUrl: "https://github.com/acme/skills",
    });

    expect(
      fetchGithubRepoOutputSchema.parse({
        branch: "main",
        commitDate: "2024-01-01T00:00:00.000Z",
        commitMessage: "Initial commit",
        commitSha: "abc123",
        forkCount: 1,
        invalidSkills: [],
        licenseInfo: { name: "MIT" },
        nameWithOwner: "acme/skills",
        owner: "acme",
        ownerAvatarUrl: "https://example.com/avatar.png",
        ownerHandle: "acme",
        ownerName: "Acme",
        recentCommits: [
          {
            committedDate: "2024-01-01T00:00:00.000Z",
            message: "Initial commit",
            sha: "abc123",
            url: "https://github.com/acme/skills/commit/abc123",
          },
        ],
        repo: "skills",
        repoCreatedAt: "2023-01-01T00:00:00.000Z",
        repoUpdatedAt: "2024-01-01T00:00:00.000Z",
        repoUrl: "https://github.com/acme/skills",
        requestedSkillPath: null,
        skills: [],
        stargazerCount: 2,
        tree: [
          {
            path: "skills/example/skill.md",
            sha: "blob-1",
            type: "blob",
          },
        ],
      }),
    ).toMatchObject({
      branch: "main",
      commitSha: "abc123",
      repo: "skills",
    });
  });

  test("exposes the public github fetch route used by the api layer", () => {
    expect(githubContract.fetchRepo).toBeDefined();
  });
});
