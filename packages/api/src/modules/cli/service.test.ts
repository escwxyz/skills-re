import { describe, expect, test } from "bun:test";

import { createCliService } from "./service";

const skill = {
  authorHandle: "acme",
  createdAt: 1,
  description: "Demo skill",
  downloadsAllTime: 0,
  downloadsTrending: 0,
  forkCount: 0,
  id: "skill_1",
  isVerified: true,
  latestVersion: "1.0.0",
  license: null,
  ownerAvatarUrl: null,
  primaryCategory: null,
  repoName: "skills",
  repoUrl: "https://github.com/acme/skills",
  slug: "demo",
  stargazerCount: 0,
  syncTime: 1,
  tags: [],
  title: "Demo",
  updatedAt: 1,
  viewsAllTime: 0,
};

const snapshot = {
  archiveR2Key: "archives/demo.tar.gz",
  description: "Demo skill",
  directoryPath: "skills/demo",
  entryPath: "skills/demo/SKILL.md",
  hash: "hash-1",
  id: "snap_1",
  isDeprecated: false,
  name: "Demo",
  skillId: "skill_1",
  sourceCommitDate: null,
  sourceCommitMessage: null,
  sourceCommitSha: null,
  sourceCommitUrl: null,
  syncTime: 1,
  version: "1.0.0",
};

describe("createCliService", () => {
  test("resolves latest install metadata", async () => {
    const service = createCliService({
      findSkillByPath: async () => null,
      findSkillBySlug: async () => skill,
      getSnapshotById: async () => null,
      getSnapshotBySkillAndVersion: async () => null,
      listSnapshotsPageBySkill: async () => ({ page: [snapshot] }),
    });

    const result = await service.resolveInstall({
      requestHeaders: new Headers({ host: "api.example.com", "x-forwarded-proto": "https" }),
      skill: "demo",
    });

    expect(result.archive.downloadUrl).toBe(
      "https://api.example.com/skills/download?snapshotId=snap_1",
    );
    expect(result.lockEntry).toEqual({
      source: "acme/skills",
      sourceType: "github",
      sourceUrl: "https://github.com/acme/skills",
      skillPath: "skills/demo/SKILL.md",
      archiveHash: "hash-1",
      version: "1.0.0",
    });
  });

  test("resolves explicit version metadata", async () => {
    const service = createCliService({
      findSkillByPath: async () => null,
      findSkillBySlug: async () => skill,
      getSnapshotById: async () => null,
      getSnapshotBySkillAndVersion: async () => snapshot,
      listSnapshotsPageBySkill: async () => ({ page: [] }),
    });

    const result = await service.resolveInstall({ skill: "demo", version: "1.0.0" });
    expect(result.snapshot.version).toBe("1.0.0");
  });

  test("reports unavailable archive metadata", async () => {
    const service = createCliService({
      findSkillByPath: async () => null,
      findSkillBySlug: async () => skill,
      getSnapshotById: async () => null,
      getSnapshotBySkillAndVersion: async () => null,
      listSnapshotsPageBySkill: async () => ({ page: [{ ...snapshot, archiveR2Key: null }] }),
    });

    const result = await service.resolveInstall({ skill: "demo" });
    expect(result.archive.available).toBe(false);
    expect(result.archive.downloadUrl).toBeUndefined();
  });
});
