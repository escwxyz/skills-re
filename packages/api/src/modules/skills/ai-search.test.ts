/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { SearchSkillRow } from "../shared/search-skill";
import { buildAiSearchResult } from "./ai-search";

describe("buildAiSearchResult", () => {
  test("uses the skills folder slug for path candidates", async () => {
    const pathCandidates: {
      authorHandle: string;
      repoName?: string;
      skillSlug: string;
    }[] = [];
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
