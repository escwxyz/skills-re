/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { fetchRepo } from "./service";

describe("github service", () => {
  test("delegates repo fetches to the injected runtime", async () => {
    const calls: { githubUrl: string }[] = [];
    const result = await fetchRepo(
      {
        githubUrl: "https://github.com/acme/skills",
      },
      {
        fetchRepo(input) {
          calls.push(input);
          return {
            branch: "main",
            commitDate: null,
            commitMessage: null,
            commitSha: "abc123",
            forkCount: null,
            invalidSkills: [],
            licenseInfo: null,
            nameWithOwner: "acme/skills",
            owner: "acme",
            ownerAvatarUrl: null,
            ownerHandle: "acme",
            ownerName: null,
            recentCommits: [],
            repo: "skills",
            repoCreatedAt: null,
            repoUpdatedAt: null,
            repoUrl: null,
            requestedSkillPath: null,
            skills: [],
            stargazerCount: null,
            tree: [],
          };
        },
      },
    );

    expect(result).toEqual({
      branch: "main",
      commitDate: null,
      commitMessage: null,
      commitSha: "abc123",
      forkCount: null,
      invalidSkills: [],
      licenseInfo: null,
      nameWithOwner: "acme/skills",
      owner: "acme",
      ownerAvatarUrl: null,
      ownerHandle: "acme",
      ownerName: null,
      recentCommits: [],
      repo: "skills",
      repoCreatedAt: null,
      repoUpdatedAt: null,
      repoUrl: null,
      requestedSkillPath: null,
      skills: [],
      stargazerCount: null,
      tree: [],
    });
    expect(calls).toEqual([
      {
        githubUrl: "https://github.com/acme/skills",
      },
    ]);
  });
});
