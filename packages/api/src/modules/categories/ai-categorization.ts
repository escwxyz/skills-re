import { chat } from "@tanstack/ai";
import { z } from "zod/v4";

import type { AiTaskRuntime } from "../ai/runtime";
import { parseJsonFromModelText } from "../ai/model-output";
import { retryAiTaskCall } from "../ai/retry";
import { CATEGORY_SLUGS } from "./taxonomy";
import type { CategoryDefinition } from "./taxonomy";

export const skillCategorySlugSchema = z.enum(CATEGORY_SLUGS);

export type SkillCategorySlug = z.infer<typeof skillCategorySlugSchema>;

const MAX_DESCRIPTION_CHARS = 2500;

export const categoryScoresSchema = z.record(skillCategorySlugSchema, z.number().min(0).max(10));

export const categorizationOutputSchema = z.object({
  items: z.array(
    z.object({
      confidence: z.number().min(0).max(1),
      key: z.string(),
      primaryCategory: skillCategorySlugSchema,
      reasoning: z.string().min(1),
      scores: categoryScoresSchema,
    }),
  ),
});

export type SkillCategoryDefinition = CategoryDefinition;

export interface SkillCategorizationInputItem {
  key: string;
  title: string;
  description: string;
  tags: string[];
}

export interface SkillCategorizationOutputItem {
  key: string;
  scores: Record<SkillCategorySlug, number>;
  primaryCategory: SkillCategorySlug;
  confidence: number;
  reasoning: string;
}

const compressDescription = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_DESCRIPTION_CHARS) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_DESCRIPTION_CHARS)}\n\n[description truncated for categorization]`;
};

const resolveCategorizationDeps = (deps?: {
  chat?: typeof chat;
  getAdapters: AiTaskRuntime["getAdapters"];
}) => {
  if (!deps?.getAdapters) {
    throw new Error("AI categorization runtime is unavailable.");
  }

  return {
    chat: deps.chat ?? chat,
    getAdapters: deps.getAdapters,
  };
};

export const generateSkillCategoriesBatch = async (
  input: {
    categories: SkillCategoryDefinition[];
    items: SkillCategorizationInputItem[];
  },
  deps?: {
    chat?: typeof chat;
    getAdapters: AiTaskRuntime["getAdapters"];
  },
) => {
  const resolvedDeps = resolveCategorizationDeps(deps);

  const systemPrompt = [
    "You are the taxonomy steward for skill categories.",
    "Goal: classify each skill by its primary deliverable type.",
    "Return strict JSON only. No markdown, no code fences, no prose.",
    "Use all 9 categories and score each category from 0 to 10 for every item.",
    "Scoring rubric:",
    "1) Primary deliverable match: 0..5",
    "2) Keyword and semantic overlap: 0..3",
    "3) Typical use-case alignment: 0..2",
    "Always choose the highest scoring category as primaryCategory.",
    "Prefer specific categories over 'other'. Use 'other' only for weak/ambiguous matches.",
    "Keep key exactly unchanged from input.",
    "Output exactly one item for each input item.",
    "The first character of your response must be '{' and the last must be '}'.",
  ].join("\n");

  const categoriesText = input.categories
    .map(
      (category) =>
        `- ${category.slug} (${category.name}): keywords: ${category.keywords.join(", ")}`,
    )
    .join("\n");

  const skillsText = input.items
    .map(
      (item) =>
        `- key: ${item.key}\n  title: ${item.title}\n  description: ${compressDescription(item.description)}\n  tags: ${item.tags.join(", ") || "(none)"}`,
    )
    .join("\n\n");

  const userPrompt = `Categories:\n${categoriesText}\n\nSkills:\n${skillsText}\n\nOutput shape exactly:\n{"items":[{"key":"<input key>","scores":{"code-frameworks":0,"tools-platforms":0,"analysis-insights":0,"design-creative":0,"process-methodology":0,"communication-strategy":0,"domain-expertise":0,"operations-automation":0,"other":0},"primaryCategory":"code-frameworks","confidence":0.85,"reasoning":"<short reason>"}]}`;

  console.info("[ai-categorization] resolving adapters", { itemCount: input.items.length });
  const adapters = resolvedDeps.getAdapters("skill-categorization");
  console.info("[ai-categorization] starting adapter loop", { adapterCount: adapters.length });

  const expectedKeys = new Set(input.items.map((item) => item.key));
  let lastError: unknown = null;
  for (const [adapterIndex, adapter] of adapters.entries()) {
    console.info("[ai-categorization] trying adapter", {
      adapterIndex,
      itemCount: input.items.length,
    });
    try {
      const text = await retryAiTaskCall(
        async () =>
          await resolvedDeps.chat({
            adapter,
            maxTokens: 4096,
            messages: [{ content: userPrompt, role: "user" }],
            stream: false,
            systemPrompts: [systemPrompt],
          }),
      );

      const output = categorizationOutputSchema.parse(parseJsonFromModelText(text));

      const returnedKeys = new Set(output.items.map((item) => item.key));
      const missingKey = [...expectedKeys].find((key) => !returnedKeys.has(key));
      if (
        output.items.length !== input.items.length ||
        returnedKeys.size !== expectedKeys.size ||
        missingKey !== undefined
      ) {
        lastError = new Error(
          missingKey === undefined
            ? "Categorization output must contain exactly one result per input item."
            : `Categorization output is missing key: ${missingKey}`,
        );
        console.warn("[ai-categorization] adapter output invalid, trying next", {
          adapterIndex,
          error: (lastError as Error).message,
        });
        continue;
      }

      console.info("[ai-categorization] adapter succeeded", { adapterIndex });
      return {
        items: output.items.map(
          (item): SkillCategorizationOutputItem => ({
            confidence: item.confidence,
            key: item.key,
            primaryCategory: item.primaryCategory,
            reasoning: item.reasoning,
            scores: item.scores,
          }),
        ),
      };
    } catch (error) {
      lastError = error;
      console.warn("[ai-categorization] adapter failed, trying next", {
        adapterIndex,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const finalError =
    lastError instanceof Error ? lastError : new Error("Categorization model call failed.");
  console.error("[ai-categorization] all adapters exhausted", { error: finalError.message });
  throw finalError;
};
