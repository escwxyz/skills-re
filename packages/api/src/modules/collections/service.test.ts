/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createCollectionsService } from "./service";

describe("collections service", () => {
  test("enriches collection skills with the latest static audit data", async () => {
    const auditCalls: string[] = [];
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

        if (snapshotId === "snapshot-1") {
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
            latestSnapshotId: "snapshot-1",
            latestVersion: "1.2.3",
            license: "MIT",
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
    });

    await expect(service.getCollectionBySlug({ slug: "editorial" })).resolves.toEqual({
      description: "Curated tools for review workflows.",
      id: "collection-1",
      skills: [
        {
          author: {
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
          latestVersion: "1.2.3",
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
        },
        {
          author: {
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
        },
      ],
      slug: "editorial",
      title: "Editorial",
    });

    expect(auditCalls).toEqual(["snapshot-1"]);
  });
});
