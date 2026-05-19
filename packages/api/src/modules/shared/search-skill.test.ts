/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { searchSkillListItemSchema } from "@skills-re/contract/common/content";

import { toSearchSkillItem, toValidSearchSkillItem } from "./search-skill";

describe("toSearchSkillItem", () => {
  test("maps a valid search row into the public schema", () => {
    const result = toSearchSkillItem({
      authorHandle: "acme",
      createdAt: 1,
      description: "Widget skill",
      downloadsAllTime: 10,
      downloadsTrending: 2,
      forkCount: 3,
      id: "skill-1",
      isVerified: true,
      latestAuditScore: 88,
      latestSnapshotId: "snap-1",
      latestSnapshotTotalBytes: 1234,
      latestVersion: "1.0.0",
      license: "MIT",
      ownerAvatarUrl: null,
      primaryCategory: "code-frameworks",
      repoName: "skills",
      repoUrl: "https://github.com/acme/skills",
      slug: "widget",
      stargazerCount: 4,
      syncTime: 5,
      tags: ["automation"],
      title: "Widget",
      updatedAt: 6,
      viewsAllTime: 7,
    });

    expect(() => searchSkillListItemSchema.parse(result)).not.toThrow();
    expect(result).toMatchObject({
      authorHandle: "acme",
      repoName: "skills",
      slug: "widget",
      title: "Widget",
    });
  });

  test("strips invalid github identity fields instead of failing output validation", () => {
    const result = toSearchSkillItem({
      authorHandle: "not a valid handle",
      createdAt: null,
      description: "Widget skill",
      downloadsAllTime: null,
      downloadsTrending: null,
      forkCount: null,
      id: "skill-1",
      isVerified: true,
      latestAuditScore: null,
      latestSnapshotId: null,
      latestSnapshotTotalBytes: null,
      latestVersion: null,
      license: null,
      ownerAvatarUrl: null,
      primaryCategory: null,
      repoName: "not a valid repo name!",
      repoUrl: null,
      slug: "widget",
      stargazerCount: null,
      syncTime: null,
      title: "Widget",
      updatedAt: null,
      viewsAllTime: null,
    });

    expect(() => searchSkillListItemSchema.parse(result)).not.toThrow();
    expect(result.author).toBeUndefined();
    expect(result.authorHandle).toBeUndefined();
    expect(result.repoName).toBeUndefined();
  });

  test("drops rows that still do not satisfy the schema", () => {
    const result = toValidSearchSkillItem({
      authorHandle: "acme",
      createdAt: 1,
      description: "Widget skill",
      downloadsAllTime: 10,
      downloadsTrending: 2,
      forkCount: 3,
      id: "skill-1",
      isVerified: true,
      latestAuditScore: 88,
      latestSnapshotId: "snap-1",
      latestSnapshotTotalBytes: 1234,
      latestVersion: "1.0.0",
      license: "MIT",
      ownerAvatarUrl: null,
      primaryCategory: "code-frameworks",
      repoName: "skills",
      repoUrl: "https://github.com/acme/skills",
      slug: "not a valid slug",
      stargazerCount: 4,
      syncTime: 5,
      title: "Widget",
      updatedAt: 6,
      viewsAllTime: 7,
    });

    expect(result).toBeNull();
  });
});
