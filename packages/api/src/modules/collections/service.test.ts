/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asSnapshotId } from "@skills-re/db/utils";

import { createCollectionsService } from "./service";

describe("collections service", () => {
  test("hides private collections from non-owners and returns them to owners", async () => {
    const service = createCollectionsService({
      findCollectionBySlug: () =>
        Promise.resolve({
          description: "Personal saves.",
          id: "collection-1",
          slug: "saved-skills",
          status: "active",
          title: "Saved Skills",
          userId: "user-1",
          visibility: "private",
        }),
      getSkillsByCollectionId: () => Promise.resolve([]),
    });

    await expect(service.getCollectionBySlug({ slug: "saved-skills" })).resolves.toBeNull();
    await expect(
      service.getCollectionBySlug(
        { slug: "saved-skills" },
        {
          isAdmin: false,
          userId: "user-1",
        },
      ),
    ).resolves.toEqual({
      description: "Personal saves.",
      id: "collection-1",
      skills: [],
      slug: "saved-skills",
      title: "Saved Skills",
      visibility: "private",
    });
  });

  test("passes requested visibility through collection create and update", async () => {
    const calls: unknown[] = [];
    const service = createCollectionsService({
      findCollectionById: () =>
        Promise.resolve({
          description: "Curated.",
          id: "collection-1",
          slug: "curated",
          status: "active",
          title: "Curated",
          userId: "user-1",
          visibility: "private",
        }),
      insertCollection: (input) => {
        calls.push({ insert: input });
        return Promise.resolve({ id: "collection-1" });
      },
      patchCollection: (input) => {
        calls.push({ patch: input });
        return Promise.resolve();
      },
    });

    await service.createCollection(
      {
        description: "Curated.",
        slug: "curated",
        title: "Curated",
        visibility: "public",
      },
      {
        isAdmin: false,
        userId: "user-1",
      },
    );
    await service.updateCollection(
      {
        id: "collection-1",
        visibility: "private",
      },
      {
        isAdmin: false,
        userId: "user-1",
      },
    );

    expect(calls).toEqual([
      {
        insert: {
          description: "Curated.",
          slug: "curated",
          title: "Curated",
          userId: "user-1",
          visibility: "public",
        },
      },
      {
        patch: {
          id: "collection-1",
          visibility: "private",
        },
      },
    ]);
  });

  test("enriches collection skills with the latest static audit data", async () => {
    const auditCalls: string[] = [];
    const fileCalls: string[] = [];
    const service = createCollectionsService({
      findCollectionBySlug: (slug) =>
        Promise.resolve(
          slug === "editorial"
            ? {
                description: "Curated tools for review workflows.",
                id: "collection-1",
                slug: "editorial",
                status: "active",
                title: "Editorial",
                userId: "user-1",
              }
            : null,
        ),
      getLatestStaticAuditBySnapshot: (snapshotId) => {
        auditCalls.push(snapshotId);

        if (snapshotId === asSnapshotId("snapshot-1")) {
          return Promise.resolve({
            isBlocked: false,
            overallScore: 94,
            riskLevel: "low",
            safeToPublish: true,
            status: "pass",
            summary: "Looks good.",
            syncTime: 1_700_000_000_000,
          });
        }

        return Promise.resolve(null);
      },
      getSkillsByCollectionId: () =>
        Promise.resolve([
          {
            authorHandle: "acme",
            createdAt: 1_700_000_000_000,
            description: "First skill.",
            downloadsAllTime: 1200,
            downloadsTrending: 34,
            forkCount: 8,
            id: "skill-1",
            isVerified: true,
            latestSnapshotId: asSnapshotId("snapshot-1"),
            latestVersion: "1.2.3",
            license: "MIT",
            ownerAvatarUrl: null,
            primaryCategory: "ops",
            position: 0,
            repoName: "skills",
            repoUrl: "https://github.com/acme/skills",
            slug: "first-skill",
            stargazerCount: 99,
            syncTime: 1_700_000_000_000,
            title: "First Skill",
            updatedAt: 1_700_000_000_000,
            viewsAllTime: 4500,
          },
          {
            authorHandle: "acme",
            createdAt: 1_700_000_000_001,
            description: "Second skill.",
            downloadsAllTime: 800,
            downloadsTrending: 12,
            forkCount: 3,
            id: "skill-2",
            isVerified: false,
            latestSnapshotId: null,
            latestVersion: "0.9.0",
            license: "Apache-2.0",
            ownerAvatarUrl: null,
            primaryCategory: "writing",
            position: 1,
            repoName: "skills",
            repoUrl: "https://github.com/acme/skills",
            slug: "second-skill",
            stargazerCount: 10,
            syncTime: 1_700_000_000_001,
            title: "Second Skill",
            updatedAt: 1_700_000_000_001,
            viewsAllTime: 900,
          },
        ]),
      listSkillTags: (skillId) => {
        if (skillId === "skill-1") {
          return Promise.resolve(["diff", "automation"]);
        }

        return Promise.resolve(["review"]);
      },
      listSnapshotFiles: (snapshotId) => {
        fileCalls.push(snapshotId);

        if (snapshotId === asSnapshotId("snapshot-1")) {
          return Promise.resolve([
            {
              contentType: null,
              fileHash: "hash-1",
              path: "skill.md",
              r2Key: null,
              size: 1024,
              sourceSha: null,
            },
            {
              contentType: null,
              fileHash: "hash-2",
              path: "README.md",
              r2Key: null,
              size: 512,
              sourceSha: null,
            },
          ]);
        }

        return Promise.resolve([]);
      },
    });

    await expect(service.getCollectionBySlug({ slug: "editorial" })).resolves.toEqual({
      description: "Curated tools for review workflows.",
      id: "collection-1",
      skills: [
        {
          author: {
            avatarUrl: undefined,
            githubUrl: "https://github.com/acme",
            handle: "acme",
          },
          authorHandle: "acme",
          createdAt: 1_700_000_000_000,
          description: "First skill.",
          downloadsAllTime: 1200,
          downloadsTrending: 34,
          forkCount: 8,
          id: "skill-1",
          isVerified: true,
          latestSnapshotId: "snapshot-1",
          latestVersion: "1.2.3",
          latestSnapshotTotalBytes: 1536,
          license: "MIT",
          primaryCategory: "ops",
          repoName: "skills",
          repoUrl: "https://github.com/acme/skills",
          slug: "first-skill",
          stargazerCount: 99,
          staticAudit: {
            isBlocked: false,
            overallScore: 94,
            riskLevel: "low",
            safeToPublish: true,
            status: "pass",
            summary: "Looks good.",
            syncTime: 1_700_000_000_000,
          },
          syncTime: 1_700_000_000_000,
          title: "First Skill",
          updatedAt: 1_700_000_000_000,
          viewsAllTime: 4500,
          tags: ["diff", "automation"],
        },
        {
          author: {
            avatarUrl: undefined,
            githubUrl: "https://github.com/acme",
            handle: "acme",
          },
          authorHandle: "acme",
          createdAt: 1_700_000_000_001,
          description: "Second skill.",
          downloadsAllTime: 800,
          downloadsTrending: 12,
          forkCount: 3,
          id: "skill-2",
          isVerified: false,
          latestSnapshotId: undefined,
          latestVersion: "0.9.0",
          license: "Apache-2.0",
          primaryCategory: "writing",
          repoName: "skills",
          repoUrl: "https://github.com/acme/skills",
          slug: "second-skill",
          stargazerCount: 10,
          syncTime: 1_700_000_000_001,
          title: "Second Skill",
          updatedAt: 1_700_000_000_001,
          viewsAllTime: 900,
          tags: ["review"],
        },
      ],
      slug: "editorial",
      title: "Editorial",
    });

    expect(auditCalls).toEqual(["snapshot-1"]);
    expect(fileCalls).toEqual(["snapshot-1"]);
  });
});
