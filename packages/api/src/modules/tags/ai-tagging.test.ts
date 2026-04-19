/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { AiTaskRuntime } from "../ai/runtime";
import { generateSkillTagsBatch, normalizeSkillTags } from "./ai-tagging";

describe("tagging ai helpers", () => {
  test("normalizes skill tag slugs", () => {
    expect(normalizeSkillTags(["  AI Tools  ", "best-practices", "AI   Tools"])).toEqual([
      "ai-tools",
      "best-practices",
    ]);
  });

  test("parses a fenced tagging payload and preserves structured output", async () => {
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
        generateText: (async () => ({
          text: `\`\`\`json
          {"items":[{"confidence":0.91,"dimensions":{"domain":[{"tag":"automation","source":"new","matchScore":0.92}],"skillType":["best-practices"],"techStack":["AI Tools",{"tag":"ai","source":"existing","matchScore":0.88}]},"key":"skill-1","reason":"clear match"}]}
          \`\`\``,
        })) as unknown as typeof generateSkillTagsBatch extends (...args: never[]) => unknown
          ? never
          : never,
        getModel: (() => null) as unknown as AiTaskRuntime["getModel"],
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
