/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { SearchSkillRow } from "../shared/search-skill";
import { buildAiSearchResult } from ".";

const resolvedSkill: SearchSkillRow = {
  authorHandle: "acme",
  createdAt: 1,
  description: "Widget skill",
  downloadsAllTime: 10,
  downloadsTrending: 2,
  forkCount: 3,
  id: "skill-1",
  isVerified: true,
  latestVersion: "1.0.0",
  license: null,
  ownerAvatarUrl: null,
  primaryCategory: "code-craft",
  repoName: "skills",
  repoUrl: null,
  slug: "widget",
  stargazerCount: 4,
  syncTime: 5,
  title: "Widget",
  updatedAt: 6,
  viewsAllTime: 7,
};

describe("buildAiSearchResult", () => {
  test("uses metadata skill IDs before falling back to path or slug resolution", async () => {
    const idCandidates: string[] = [];
    const pathCandidates: {
      authorHandle: string;
      repoName?: string;
      skillSlug: string;
    }[] = [];
    const slugCandidates: string[] = [];

    const result = await buildAiSearchResult({
      raw: {
        data: [
          {
            key: "acme/skills/skills/widget/skill.md",
            metadata: {
              skillId: "skill-1",
            },
            score: 0.9,
            slug: "widget",
            text: "Widget docs",
          },
        ],
      },
      resolveSkillById: async (id) => {
        idCandidates.push(id);
        return id === "skill-1" ? resolvedSkill : null;
      },
      resolveSkillByPath: async (candidate) => {
        pathCandidates.push(candidate);
        return null;
      },
      resolveSkillBySlug: async (slug) => {
        slugCandidates.push(slug);
        return null;
      },
    });

    expect(idCandidates).toEqual(["skill-1"]);
    expect(pathCandidates).toEqual([]);
    expect(slugCandidates).toEqual([]);
    expect(result.ai).toMatchObject({
      raw: {
        resolution: {
          pathCandidatesCount: 1,
          slugCandidatesCount: 1,
        },
      },
      resolvedSkillsCount: 1,
      resultCount: 1,
    });
    expect(result.page).toHaveLength(1);
    expect(result.page[0]).toMatchObject({
      aiMatch: {
        itemKey: "acme/skills/skills/widget/skill.md",
        score: 0.9,
        snippet: "Widget docs",
      },
      authorHandle: "acme",
      createdAt: 1,
      description: "Widget skill",
      id: "skill-1",
      repoName: "skills",
      slug: "widget",
      title: "Widget",
    });
  });

  test("uses the skills folder slug for path candidates", async () => {
    const pathCandidates: {
      authorHandle: string;
      repoName?: string;
      skillSlug: string;
    }[] = [];

    const result = await buildAiSearchResult({
      raw: {
        data: [
          {
            key: "acme/skills/widget/preview/skill.md",
            slug: "preview",
          },
        ],
      },
      resolveSkillByPath: async (candidate) => {
        pathCandidates.push(candidate);
        return candidate.skillSlug === "widget" ? resolvedSkill : null;
      },
      resolveSkillBySlug: async () => null,
    });

    expect(pathCandidates).toEqual([
      {
        authorHandle: "acme",
        repoName: "skills",
        skillSlug: "widget",
      },
      {
        authorHandle: "acme",
        repoName: "skills",
        skillSlug: "preview",
      },
    ]);
    expect(result.ai.raw.resolution).toEqual({
      pathCandidatesCount: 2,
      slugCandidatesCount: 2,
    });
    expect(result.page).toHaveLength(1);
    expect(result.page[0]).toMatchObject({
      id: "skill-1",
      slug: "widget",
      title: "Widget",
    });
  });

  test("resolves skills from chunks response format (Cloudflare AI Search native format)", async () => {
    const idCandidates: string[] = [];

    const result = await buildAiSearchResult({
      raw: {
        search_query: "email automation skill",
        chunks: [
          {
            id: "ac374870df0f57620412b476b7513bd6c5af857fffaf2eadfc76081e474d84bf",
            source: "skill-1.md",
            score: 0.984,
            text: "Widget skill content",
            metadata: {
              skillId: "skill-1",
              skillSlug: "widget",
              authorHandle: "acme",
            },
          },
        ],
      },
      resolveSkillById: async (id) => {
        idCandidates.push(id);
        return id === "skill-1" ? resolvedSkill : null;
      },
      resolveSkillByPath: async () => null,
      resolveSkillBySlug: async () => null,
    });

    expect(idCandidates).toEqual(["skill-1"]);
    expect(result.ai.resultCount).toBe(1);
    expect(result.ai.resolvedSkillsCount).toBe(1);
    expect(result.page).toHaveLength(1);
    expect(result.page[0]).toMatchObject({ id: "skill-1", slug: "widget" });
  });

  test("resolves skills from chunks using source filename when metadata lacks skillId", async () => {
    const idCandidates: string[] = [];

    const result = await buildAiSearchResult({
      raw: {
        chunks: [
          {
            id: "somehash",
            source: "skill-1.md",
            score: 0.9,
            text: "Widget skill content",
          },
        ],
      },
      resolveSkillById: async (id) => {
        idCandidates.push(id);
        return id === "skill-1" ? resolvedSkill : null;
      },
      resolveSkillByPath: async () => null,
      resolveSkillBySlug: async () => null,
    });

    expect(idCandidates).toEqual(["skill-1"]);
    expect(result.page).toHaveLength(1);
    expect(result.page[0]).toMatchObject({ id: "skill-1" });
  });

  test("resolves skills from chunks that only have id/score/text (no metadata or source)", async () => {
    const slugCandidates: string[] = [];

    const result = await buildAiSearchResult({
      raw: {
        search_query: "Mastra framework documentation and tutorial skill",
        chunks: [
          {
            id: "ac2dcacf337effb24752219974d5ef5080ba26adfeabf796f3742337cc8c91ca",
            type: "text",
            score: 0.71177137,
            text: '---\nname: widget\ndescription: "Widget skill"\n---\n\n# Widget\n\nSome content.',
          },
        ],
      },
      resolveSkillById: async () => null,
      resolveSkillByPath: async () => null,
      resolveSkillBySlug: async (slug) => {
        slugCandidates.push(slug);
        return slug === "widget" ? resolvedSkill : null;
      },
    });

    expect(slugCandidates).toContain("widget");
    expect(result.page).toHaveLength(1);
    expect(result.page[0]).toMatchObject({ id: "skill-1", slug: "widget" });
  });
});
