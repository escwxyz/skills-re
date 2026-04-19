import { extractJsonMiddleware, generateText, wrapLanguageModel } from "ai";
import { z } from "zod/v4";

import type { AiTaskRuntime } from "../ai/runtime";

export const skillCategorySlugSchema = z.enum([
  "code-frameworks",
  "tools-platforms",
  "analysis-insights",
  "design-creative",
  "process-methodology",
  "communication-strategy",
  "domain-expertise",
  "operations-automation",
  "other",
]);

export type SkillCategorySlug = z.infer<typeof skillCategorySlugSchema>;

const MAX_DESCRIPTION_CHARS = 2500;
const JSON_CODE_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;

const categoryScoresSchema = z.object({
  "analysis-insights": z.number().min(0).max(10),
  "code-frameworks": z.number().min(0).max(10),
  "communication-strategy": z.number().min(0).max(10),
  "design-creative": z.number().min(0).max(10),
  "domain-expertise": z.number().min(0).max(10),
  "operations-automation": z.number().min(0).max(10),
  other: z.number().min(0).max(10),
  "process-methodology": z.number().min(0).max(10),
  "tools-platforms": z.number().min(0).max(10),
});

const categorizationOutputSchema = z.object({
  items: z.array(
    z.object({
      confidence: z.number().min(0).max(1),
      key: z.string(),
      primaryCategory: skillCategorySlugSchema,
      reasoning: z.string().min(1),
      scores: categoryScoresSchema,
    })
  ),
});

export interface SkillCategoryDefinition {
  slug: SkillCategorySlug;
  name: string;
  description: string;
  keywords: string[];
}

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

const extractJsonLikeFromValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const hasCategorizationItemsArray = (value: unknown): value is { items: unknown[] } =>
  Boolean(value) &&
  typeof value === "object" &&
  Array.isArray((value as { items?: unknown }).items);

const extractFromChoiceContentParts = (content: unknown): unknown => {
  if (!Array.isArray(content)) {
    return undefined;
  }

  for (const part of content) {
    if (!(part && typeof part === "object")) {
      continue;
    }
    const { text } = part as Record<string, unknown>;
    const parsedText = extractJsonLikeFromValue(text);
    if (hasCategorizationItemsArray(parsedText)) {
      return parsedText;
    }
  }

  return undefined;
};

const extractFromChoices = (value: unknown): unknown => {
  if (!(value && typeof value === "object")) {
    return undefined;
  }

  const { choices } = value as Record<string, unknown>;
  if (!Array.isArray(choices) || choices.length === 0) {
    return undefined;
  }

  const firstChoice = choices[0];
  if (!(firstChoice && typeof firstChoice === "object")) {
    return undefined;
  }

  const { message } = firstChoice as Record<string, unknown>;
  if (!(message && typeof message === "object")) {
    return undefined;
  }

  const { content } = message as Record<string, unknown>;
  const parsedContent = extractJsonLikeFromValue(content);
  if (hasCategorizationItemsArray(parsedContent)) {
    return parsedContent;
  }

  return extractFromChoiceContentParts(content);
};

const unwrapCategorizationPayload = (value: unknown): unknown => {
  if (hasCategorizationItemsArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const { json } = value as Record<string, unknown>;
    if (hasCategorizationItemsArray(json)) {
      return json;
    }
  }

  const extractedFromChoices = extractFromChoices(value);
  if (hasCategorizationItemsArray(extractedFromChoices)) {
    return extractedFromChoices;
  }

  return value;
};

const parseCategorizationOutput = (text: string) => {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(JSON_CODE_FENCE_PATTERN);
  const withoutFence = fenceMatch?.[1]?.trim() ?? trimmed;
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  const braceSlice =
    firstBrace !== -1 && lastBrace > firstBrace
      ? withoutFence.slice(firstBrace, lastBrace + 1)
      : withoutFence;

  const parseCandidates = [trimmed, withoutFence, braceSlice];

  let parsedJson: unknown = null;
  let parsed = false;
  for (const candidate of parseCandidates) {
    try {
      parsedJson = JSON.parse(candidate);
      parsed = true;
      break;
    } catch {
      // Try next normalized candidate.
    }
  }

  if (!parsed) {
    throw new Error(
      "Categorization model returned invalid JSON after fence/braces normalization."
    );
  }

  const unwrappedJson = unwrapCategorizationPayload(parsedJson);

  const parsedOutput = categorizationOutputSchema.safeParse(unwrappedJson);
  if (!parsedOutput.success) {
    throw new Error(
      `Categorization model returned invalid schema: ${parsedOutput.error.message}`
    );
  }

  return parsedOutput.data;
};

const resolveCategorizationDeps = (deps?: {
  generateText?: typeof generateText;
  getModel: AiTaskRuntime["getModel"];
}) => {
  if (!deps?.getModel) {
    throw new Error("AI categorization runtime is unavailable.");
  }

  return {
    generateText: deps.generateText ?? generateText,
    getModel: deps.getModel,
  };
};

export const generateSkillCategoriesBatch = async (
  input: {
    categories: SkillCategoryDefinition[];
    items: SkillCategorizationInputItem[];
  },
  deps?: {
    generateText?: typeof generateText;
    getModel: AiTaskRuntime["getModel"];
  }
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
        `- ${category.slug} (${category.name}): ${category.description} | keywords: ${category.keywords.join(", ")}`
    )
    .join("\n");

  const skillsText = input.items
    .map(
      (item) =>
        `- key: ${item.key}\n  title: ${item.title}\n  description: ${compressDescription(item.description)}\n  tags: ${item.tags.join(", ") || "(none)"}`
    )
    .join("\n\n");

  const userPrompt = `Categories:\n${categoriesText}\n\nSkills:\n${skillsText}\n\nOutput shape exactly:\n{"items":[{"key":"<input key>","scores":{"code-frameworks":0,"tools-platforms":0,"analysis-insights":0,"design-creative":0,"process-methodology":0,"communication-strategy":0,"domain-expertise":0,"operations-automation":0,"other":0},"primaryCategory":"code-frameworks","confidence":0.85,"reasoning":"<short reason>"}]}`;

  const model = resolvedDeps.getModel("skill-categorization");
  const result = await resolvedDeps.generateText({
    maxOutputTokens: 4096,
    model: deps?.generateText
      ? (model as never)
      : wrapLanguageModel({
          middleware: extractJsonMiddleware(),
          model: model as never,
        }),
    prompt: userPrompt,
    system: systemPrompt,
  });
  const output = parseCategorizationOutput(result.text);

  return {
    items: output.items.map((item): SkillCategorizationOutputItem => ({
      confidence: item.confidence,
      key: item.key,
      primaryCategory: item.primaryCategory,
      reasoning: item.reasoning,
      scores: item.scores,
    })),
  };
};
