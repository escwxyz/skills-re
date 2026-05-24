/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { MockLanguageModelV3 } from "ai/test";

import { generateSkillTagsBatch, normalizeSkillTags } from "./ai-tagging";

describe("tagging ai helpers", () => {
  test("normalizes skill tag slugs", () => {
    expect(normalizeSkillTags(["  AI Tools  ", "best-practices", "AI   Tools"])).toEqual([
      "ai-tools",
      "best-practices",
    ]);
  });

  test("advances to the fallback model when primary tagging output is invalid", async () => {
    const primaryModel = new MockLanguageModelV3({
      modelId: "primary-model",
    });
    const fallbackModel = new MockLanguageModelV3({
      modelId: "fallback-model",
    });
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

          const modelId = (options.model as { modelId?: string } | undefined)?.modelId;
          if (modelId === "primary-model") {
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
                      ],
                    },
                    key: "wrong-key",
                    reason: "bad key should trigger fallback",
                  },
                ],
              }),
            };
          }

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
        getModels: () => [primaryModel, fallbackModel],
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
    expect(generateTextCalls).toHaveLength(2);
    expect(generateTextCalls[0]?.options.maxOutputTokens).toBe(4096);
    expect(generateTextCalls[0]?.options.model).toEqual(
      expect.objectContaining({
        modelId: "primary-model",
        specificationVersion: "v3",
      }),
    );
    expect(generateTextCalls[1]?.options.model).toEqual(
      expect.objectContaining({
        modelId: "fallback-model",
        specificationVersion: "v3",
      }),
    );
  });
});
