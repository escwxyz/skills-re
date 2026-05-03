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
      resolveSkillById: (id) => {
        idCandidates.push(id);
        return id === "skill-1" ? resolvedSkill : null;
      },
      resolveSkillByPath: (candidate) => {
        pathCandidates.push(candidate);
        return null;
      },
      resolveSkillBySlug: (slug) => {
        slugCandidates.push(slug);
        return null;
      },
    });

    expect(idCandidates).toEqual(["skill-1"]);
    expect(pathCandidates).toEqual([]);
    expect(slugCandidates).toEqual([]);
    expect(result.ai).toMatchObject({
      mode: "ai",
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
      resolveSkillByPath: (candidate) => {
        pathCandidates.push(candidate);
        return candidate.skillSlug === "widget" ? resolvedSkill : null;
      },
      resolveSkillBySlug: () => null,
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
});
