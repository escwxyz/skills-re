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

  test("parses raw tagging JSON and preserves normalized output", async () => {
    const generateTextCalls: {
      options: { maxOutputTokens?: number; model?: unknown };
    }[] = [];
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
        generateText: (async (options: { maxOutputTokens?: number; model?: unknown }) => {
          generateTextCalls.push({
            options: {
              maxOutputTokens: options.maxOutputTokens,
              model: options.model,
            },
          });

          return {
            text: JSON.stringify({
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
            }),
          };
        }) as never,
        getModel: (() => ({ id: "gateway-model" })) as never,
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
    expect(generateTextCalls).toHaveLength(1);
    expect(generateTextCalls[0]?.options.maxOutputTokens).toBe(4096);
    expect(generateTextCalls[0]?.options.model).toEqual(
      expect.objectContaining({
        specificationVersion: "v3",
      }),
    );
  });
});
