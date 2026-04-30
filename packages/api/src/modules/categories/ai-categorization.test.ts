// oxlint-disable require-await
/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  categorizationOutputSchema,
  generateSkillCategoriesBatch,
  skillCategorySlugSchema,
} from "./ai-categorization";
import type { AiTaskRuntime } from "../ai/runtime";

describe("categorization ai helpers", () => {
  test("parses a fenced categorization payload", async () => {
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
        generateText: (async () => ({
          text: `{"items":[{"confidence":0.87,"key":"skill-1","primaryCategory":"code-frameworks","reasoning":"clear primary deliverable","scores":{"analysis-insights":1,"code-frameworks":10,"communication-strategy":0,"design-creative":0,"domain-expertise":2,"operations-automation":0,"other":0,"process-methodology":1,"tools-platforms":2}}]}`,
        })) as unknown as typeof generateSkillCategoriesBatch extends (...args: never[]) => unknown
          ? never
          : never,
        getModel: (() => null) as unknown as AiTaskRuntime["getModel"],
      } as never,
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        confidence: 0.87,
        key: "skill-1",
        primaryCategory: "code-frameworks",
      }),
    ]);
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
