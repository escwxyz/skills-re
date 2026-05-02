// oxlint-disable require-await
/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  categorizationOutputSchema,
  generateSkillCategoriesBatch,
  skillCategorySlugSchema,
} from "./ai-categorization";

describe("categorization ai helpers", () => {
  test("parses a structured categorization payload and falls back across adapters", async () => {
    const chatCalls: unknown[] = [];
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
        chat: (async ({ adapter }) => {
          chatCalls.push(adapter);
          if (chatCalls.length === 1) {
            throw new Error("primary adapter failed");
          }

          return {
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
          };
        }) as never,
        getAdapters: (() => [{ id: "adapter-1" }, { id: "adapter-2" }]) as never,
      } as never,
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        confidence: 0.87,
        key: "skill-1",
        primaryCategory: "code-frameworks",
      }),
    ]);
    expect(chatCalls).toHaveLength(2);
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
