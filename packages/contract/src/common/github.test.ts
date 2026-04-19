/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  fetchGithubRepoInputSchema,
  requestContextSchema,
  submitGithubPreparedOutputSchema,
  treeEntrySchema,
  uploadRepoInputSchema,
  uploadSkillInputSchema,
} from "./github";

describe("common github schemas", () => {
  test("parse the shared github request and upload shapes", () => {
    expect(
      fetchGithubRepoInputSchema.parse({
        githubUrl: "https://github.com/example/skills",
      }),
    ).toEqual({
      githubUrl: "https://github.com/example/skills",
    });

    expect(
      requestContextSchema.parse({
        country: "DE",
        ip: "127.0.0.1",
      }),
    ).toEqual({
      country: "DE",
      ip: "127.0.0.1",
    });

    expect(
      treeEntrySchema.parse({
        path: "skills/example/skill.md",
        sha: "abc123",
        type: "blob",
      }),
    ).toEqual({
      path: "skills/example/skill.md",
      sha: "abc123",
      type: "blob",
    });

    expect(
      uploadRepoInputSchema.parse({
        createdAt: 1,
        defaultBranch: "main",
        forks: 2,
        license: "MIT",
        nameWithOwner: "example/skills",
        owner: {
          handle: "example",
        },
        stars: 3,
        updatedAt: 4,
      }),
    ).toEqual({
      createdAt: 1,
      defaultBranch: "main",
      forks: 2,
      license: "MIT",
      nameWithOwner: "example/skills",
      owner: {
        handle: "example",
      },
      stars: 3,
      updatedAt: 4,
    });

    expect(
      uploadSkillInputSchema.parse({
        description: "Example skill",
        directoryPath: "skills/example",
        entryPath: "skills/example/skill.md",
        initialSnapshot: {
          files: [
            {
              content: "hello",
              path: "skills/example/skill.md",
            },
          ],
          sourceCommitDate: 1,
          sourceCommitSha: "abc123",
          sourceRef: "main",
          tree: [
            {
              path: "skills/example/skill.md",
              sha: "abc123",
              type: "blob",
            },
          ],
        },
        slug: "example-skill",
        sourceLocator: "github",
        sourceType: "github",
        title: "Example skill",
      }),
    ).toEqual({
      description: "Example skill",
      directoryPath: "skills/example",
      entryPath: "skills/example/skill.md",
      initialSnapshot: {
        files: [
          {
            content: "hello",
            path: "skills/example/skill.md",
          },
        ],
        sourceCommitDate: 1,
        sourceCommitSha: "abc123",
        sourceRef: "main",
        tree: [
          {
            path: "skills/example/skill.md",
            sha: "abc123",
            type: "blob",
          },
        ],
      },
      slug: "example-skill",
      sourceLocator: "github",
      sourceType: "github",
      title: "Example skill",
    });

    expect(
      submitGithubPreparedOutputSchema.parse({
        recentCommits: [
          {
            sha: "abc123",
          },
        ],
        repo: {
          createdAt: 1,
          defaultBranch: "main",
          forks: 2,
          license: "MIT",
          nameWithOwner: "example/skills",
          owner: {
            handle: "example",
          },
          stars: 3,
          updatedAt: 4,
        },
        skills: [
          {
            description: "Example skill",
            directoryPath: "skills/example",
            entryPath: "skills/example/skill.md",
            initialSnapshot: {
              files: [
                {
                  content: "hello",
                  path: "skills/example/skill.md",
                },
              ],
              sourceCommitDate: 1,
              sourceCommitSha: "abc123",
              sourceRef: "main",
              tree: [
                {
                  path: "skills/example/skill.md",
                  sha: "abc123",
                  type: "blob",
                },
              ],
            },
            slug: "example-skill",
            sourceLocator: "github",
            sourceType: "github",
            title: "Example skill",
          },
        ],
      }),
    ).toEqual({
      recentCommits: [
        {
          sha: "abc123",
        },
      ],
      repo: {
        createdAt: 1,
        defaultBranch: "main",
        forks: 2,
        license: "MIT",
        nameWithOwner: "example/skills",
        owner: {
          handle: "example",
        },
        stars: 3,
        updatedAt: 4,
      },
      skills: [
        {
          description: "Example skill",
          directoryPath: "skills/example",
          entryPath: "skills/example/skill.md",
          initialSnapshot: {
            files: [
              {
                content: "hello",
                path: "skills/example/skill.md",
              },
            ],
            sourceCommitDate: 1,
            sourceCommitSha: "abc123",
            sourceRef: "main",
            tree: [
              {
                path: "skills/example/skill.md",
                sha: "abc123",
                type: "blob",
              },
            ],
          },
          slug: "example-skill",
          sourceLocator: "github",
          sourceType: "github",
          title: "Example skill",
        },
      ],
    });
  });
});
