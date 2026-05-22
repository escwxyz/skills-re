/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  buildPreparedGithubSkillBatches,
  DEFAULT_GITHUB_SUBMIT_BATCH_SIZE,
} from "./github-submit-prepared";

describe("buildPreparedGithubSkillBatches", () => {
  test("builds root-relative prepared payloads and chunks them into batches", async () => {
    const batches = await buildPreparedGithubSkillBatches({
      batchSize: 1,
      preview: {
        branch: "main",
        commitDate: "2026-05-20T10:00:00.000Z",
        commitMessage: "feat: add skills",
        commitSha: "abc123",
        forkCount: 2,
        invalidSkills: [],
        licenseInfo: { name: "MIT" },
        nameWithOwner: "acme/skills",
        owner: "acme",
        ownerAvatarUrl: null,
        ownerHandle: "acme",
        ownerName: "Acme",
        recentCommits: [{ sha: "abc123", url: "https://github.com/acme/skills/commit/abc123" }],
        repo: "skills",
        repoCreatedAt: "2026-05-18T10:00:00.000Z",
        repoUpdatedAt: "2026-05-20T10:00:00.000Z",
        requestedSkillPath: null,
        skills: [
          {
            files: [
              {
                content: "---\nname: Alpha\n---\nalpha",
                path: "SKILL.md",
              },
              {
                content: "reference",
                path: "references/guide.md",
              },
            ],
            frontmatter: {
              license: "Apache-2.0",
              metadata: { version: "2.0.0" },
              tags: ["sdk", "api"],
            },
            skillDescription: "Alpha skill",
            skillMdContent: "---\nname: Alpha\n---\nalpha",
            skillMdPath: "skills/alpha/SKILL.md",
            skillRootPath: "skills/alpha",
            skillTitle: "Alpha",
          },
          {
            files: [
              {
                content: "---\nname: Beta\n---\nbeta",
                path: "SKILL.md",
              },
            ],
            frontmatter: {},
            skillDescription: "Beta skill",
            skillMdContent: "---\nname: Beta\n---\nbeta",
            skillMdPath: "skills/beta/SKILL.md",
            skillRootPath: "skills/beta",
            skillTitle: "Beta",
          },
        ],
        stargazerCount: 5,
        tree: [
          { path: "skills/alpha/SKILL.md", sha: "sha-1", type: "blob" },
          { path: "skills/alpha/references/guide.md", sha: "sha-2", type: "blob" },
          { path: "skills/beta/SKILL.md", sha: "sha-3", type: "blob" },
        ],
      },
      selectedSkillRootPaths: ["skills/alpha", "skills/beta"],
    });

    expect(DEFAULT_GITHUB_SUBMIT_BATCH_SIZE).toBeGreaterThan(0);
    expect(batches).toHaveLength(2);
    expect(batches[0]?.skills[0]).toMatchObject({
      description: "Alpha skill",
      directoryPath: "skills/alpha/",
      entryPath: "skills/alpha/SKILL.md",
      initialSnapshot: {
        files: [
          { content: "---\nname: Alpha\n---\nalpha", path: "SKILL.md" },
          { content: "reference", path: "references/guide.md" },
        ],
        sourceCommitSha: "abc123",
        sourceRef: "main",
        tree: [
          { path: "SKILL.md", sha: "sha-1", type: "blob" },
          { path: "references/guide.md", sha: "sha-2", type: "blob" },
        ],
      },
      license: "Apache-2.0",
      preferredVersion: "2.0.0",
      slug: "Alpha",
      sourceLocator: "github:acme/skills/skills/alpha/SKILL.md",
      sourceType: "github",
      tags: ["sdk", "api"],
      title: "Alpha",
    });
    expect(batches[0]?.skills[0]?.frontmatterHash).toHaveLength(64);
    expect(batches[0]?.skills[0]?.skillContentHash).toHaveLength(64);
    expect(batches[1]?.skills[0]).toMatchObject({
      directoryPath: "skills/beta/",
      initialSnapshot: {
        tree: [{ path: "SKILL.md", sha: "sha-3", type: "blob" }],
      },
      slug: "Beta",
    });
  });

  test("uses selected skill frontmatter license for repo payload when preview has no license", async () => {
    const batches = await buildPreparedGithubSkillBatches({
      preview: {
        branch: "main",
        commitDate: "2026-05-20T10:00:00.000Z",
        commitMessage: "feat: add skill",
        commitSha: "abc123",
        forkCount: 0,
        invalidSkills: [],
        licenseInfo: null,
        nameWithOwner: "acme/skills",
        owner: "acme",
        ownerAvatarUrl: null,
        ownerHandle: "acme",
        ownerName: "Acme",
        recentCommits: [{ sha: "abc123" }],
        repo: "skills",
        repoCreatedAt: "2026-05-18T10:00:00.000Z",
        repoUpdatedAt: "2026-05-20T10:00:00.000Z",
        requestedSkillPath: null,
        skills: [
          {
            files: [{ content: "---\nname: Alpha\nlicense: MIT\n---\nalpha", path: "SKILL.md" }],
            frontmatter: {
              license: "MIT",
            },
            skillDescription: "Alpha skill",
            skillMdContent: "---\nname: Alpha\nlicense: MIT\n---\nalpha",
            skillMdPath: "skills/alpha/SKILL.md",
            skillRootPath: "skills/alpha",
            skillTitle: "Alpha",
          },
        ],
        stargazerCount: 0,
        tree: [{ path: "skills/alpha/SKILL.md", sha: "sha-1", type: "blob" }],
      },
      selectedSkillRootPaths: ["skills/alpha"],
    });

    expect(batches[0]?.repo.license).toBe("MIT");
    expect(batches[0]?.skills[0]?.license).toBe("MIT");
  });
});
