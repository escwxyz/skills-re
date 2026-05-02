/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { generateSkillTagsBatch, normalizeSkillTags } from "./ai-tagging";

describe("tagging ai helpers", () => {
  test("normalizes skill tag slugs", () => {
    expect(normalizeSkillTags(["  AI Tools  ", "best-practices", "AI   Tools"])).toEqual([
      "ai-tools",
      "best-practices",
    ]);
  });

  test("parses a structured tagging payload and preserves normalized output", async () => {
    const result = await generateSkillTagsBatch(
      {
        existingTagCandidates: ["ai", "workflow"],
        items: [
          {
            content: "Builds automation tools.",
            description: "Builds automation tools.",
            key: "skill-1",
            title: "Automation Builder",
          },
        ],
      },
      {
        // oxlint-disable-next-line require-await
        chat: (async () => ({
          items: [
            {
              confidence: 0.91,
              dimensions: {
                domain: [
                  {
                    matchScore: 0.92,
                    source: "new",
                    tag: "automation",
                  },
                ],
                skillType: [
                  {
                    matchScore: 0.91,
                    source: "new",
                    tag: "best-practices",
                  },
                ],
                techStack: [
                  {
                    matchScore: 0.91,
                    source: "new",
                    tag: "AI Tools",
                  },
                  {
                    matchScore: 0.88,
                    source: "existing",
                    tag: "ai",
                  },
                ],
              },
              key: "skill-1",
              reason: "clear match",
            },
          ],
        })) as never,
        getAdapters: (() => [{ id: "adapter-1" }]) as never,
      } as never,
    );

    expect(result.items).toEqual([
      {
        confidence: 0.91,
        key: "skill-1",
        newTagCandidates: [
          {
            dimension: "techStack",
            matchScore: 0.91,
            slug: "ai-tools",
          },
          {
            dimension: "domain",
            matchScore: 0.92,
            slug: "automation",
          },
        ],
        reason: "clear match",
        tags: ["ai-tools", "ai", "automation"],
      },
    ]);
  });
});
