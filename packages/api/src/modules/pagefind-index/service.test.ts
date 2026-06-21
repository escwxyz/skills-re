/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createPagefindIndexService } from "./service";

describe("Pagefind index service", () => {
  test("normalizes export records and omits invalid digests", async () => {
    const service = createPagefindIndexService({
      listPagefindExportRows: async () => ({
        continueCursor: "next",
        isDone: false,
        page: [
          {
            authorHandle: "acme",
            description: "Search skill bodies",
            fileHash: "a".repeat(64).toUpperCase(),
            id: "skill-1",
            isVerified: true,
            primaryCategory: "search",
            repoName: "skills repo",
            slug: "pagefind",
            snapshotId: "snapshot/1",
            tags: ["web", "search"],
            title: "Pagefind",
            updatedAt: 123,
          },
          {
            authorHandle: "acme",
            description: "Invalid",
            fileHash: "invalid",
            id: "skill-2",
            isVerified: false,
            primaryCategory: null,
            repoName: "skills",
            slug: "invalid",
            snapshotId: "snapshot-2",
            tags: [],
            title: "Invalid",
            updatedAt: 124,
          },
        ],
        sourceWatermark: 124,
      }),
    });

    await expect(service.exportPage({ limit: 2 }, "https://api.example.com/path")).resolves.toEqual(
      {
        continueCursor: "next",
        isDone: false,
        page: [
          {
            artifactDigest: `sha256:${"a".repeat(64)}`,
            artifactUrl: "https://api.example.com/.well-known/agent-skills/snapshot%2F1/SKILL.md",
            authorHandle: "acme",
            canonicalUrl: "/skills/acme/skills%20repo/pagefind",
            description: "Search skill bodies",
            isVerified: true,
            primaryCategory: "search",
            repoName: "skills repo",
            skillId: "skill-1",
            skillSlug: "pagefind",
            snapshotId: "snapshot/1",
            tags: ["search", "web"],
            title: "Pagefind",
            updatedAt: 123,
          },
        ],
        sourceWatermark: 124,
      },
    );
  });
});
