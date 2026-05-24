// oxlint-disable require-await
/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { MockLanguageModelV3 } from "ai/test";

import {
  categorizationOutputSchema,
  generateSkillCategoriesBatch,
  skillCategorySlugSchema,
} from "./ai-categorization";

describe("categorization ai helpers", () => {
  test("parses raw categorization JSON and falls back across adapters", async () => {
    const model = new MockLanguageModelV3({
      modelId: "gateway-model",
    });
    const generateTextCalls: {
      options: { maxOutputTokens?: number; model?: unknown };
    }[] = [];
    const result = await generateSkillCategoriesBatch(
      {
        categories: [
          {
            descriptionKey: "categories_code_frameworks_description",
            keywords: ["framework", "sdk"],
            name: "Code Frameworks",
            nameKey: "categories_code_frameworks_name",
            parentSlug: null,
            slug: skillCategorySlugSchema.enum["code-frameworks"],
          },
        ],
        items: [
          {
            description: "A code framework for apps.",
            key: "skill-1",
            tags: ["framework"],
            title: "Framework Skill",
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
          if (generateTextCalls.length === 1) {
            throw new Error("primary adapter failed");
          }

          return {
            text: JSON.stringify({
              items: [
                {
                  confidence: 0.87,
                  key: "skill-1",
                  primaryCategory: "code-frameworks",
                  reasoning: "clear primary deliverable",
                  scores: {
                    "analysis-insights": 1,
                    "code-frameworks": 10,
                    "communication-strategy": 0,
                    "design-creative": 0,
                    "domain-expertise": 2,
                    "operations-automation": 0,
                    other: 0,
                    "process-methodology": 1,
                    "tools-platforms": 2,
                  },
                },
              ],
            }),
          };
        }) as never,
        getModel: () => model,
      } as never,
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        confidence: 0.87,
        key: "skill-1",
        primaryCategory: "code-frameworks",
      }),
    ]);
    expect(generateTextCalls).toHaveLength(2);
    expect(generateTextCalls.every((call) => call.options.maxOutputTokens === 4096)).toBe(true);
    expect(
      generateTextCalls.every((call) => call.options.model === generateTextCalls[0]?.options.model),
    ).toBe(true);
    expect(generateTextCalls[0]?.options.model).toEqual(
      expect.objectContaining({
        modelId: "gateway-model",
        specificationVersion: "v3",
      }),
    );
  });

  test("retries categorization calls on rate limit errors", async () => {
    const model = new MockLanguageModelV3({
      modelId: "gateway-model",
    });
    const generateTextCalls: { model: unknown }[] = [];
    const result = await generateSkillCategoriesBatch(
      {
        categories: [
          {
            descriptionKey: "categories_code_frameworks_description",
            keywords: ["framework", "sdk"],
            name: "Code Frameworks",
            nameKey: "categories_code_frameworks_name",
            parentSlug: null,
            slug: skillCategorySlugSchema.enum["code-frameworks"],
          },
        ],
        items: [
          {
            description: "A code framework for apps.",
            key: "skill-1",
            tags: ["framework"],
            title: "Framework Skill",
          },
        ],
      },
      {
        // oxlint-disable-next-line require-await
        generateText: (async ({ model }: { model: unknown }) => {
          generateTextCalls.push({ model });
          if (generateTextCalls.length === 1) {
            const error = new Error("rate limited");
            (error as { statusCode?: number }).statusCode = 429;
            throw error;
          }

          return {
            text: JSON.stringify({
              items: [
                {
                  confidence: 0.87,
                  key: "skill-1",
                  primaryCategory: "code-frameworks",
                  reasoning: "clear primary deliverable",
                  scores: {
                    "analysis-insights": 1,
                    "code-frameworks": 10,
                    "communication-strategy": 0,
                    "design-creative": 0,
                    "domain-expertise": 2,
                    "operations-automation": 0,
                    other: 0,
                    "process-methodology": 1,
                    "tools-platforms": 2,
                  },
                },
              ],
            }),
          };
        }) as never,
        getModel: () => model,
      } as never,
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        confidence: 0.87,
        key: "skill-1",
        primaryCategory: "code-frameworks",
      }),
    ]);
    expect(generateTextCalls).toHaveLength(2);
  });

  test("rejects categorization payloads missing a category score", () => {
    expect(() =>
      categorizationOutputSchema.parse({
        items: [
          {
            confidence: 0.87,
            key: "skill-1",
            primaryCategory: "code-frameworks",
            reasoning: "clear primary deliverable",
            scores: {
              "analysis-insights": 1,
              "code-frameworks": 10,
              "communication-strategy": 0,
              "design-creative": 0,
              "domain-expertise": 2,
              "operations-automation": 0,
              other: 0,
              "process-methodology": 1,
            },
          },
        ],
      }),
    ).toThrow();
  });
});
