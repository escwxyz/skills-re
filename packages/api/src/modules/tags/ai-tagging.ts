import { chat } from "@tanstack/ai";
import { z } from "zod/v4";

import type { AiTaskRuntime } from "../ai/runtime";
import { tagSlugSchema } from "@skills-re/contract/common/slugs";

const MAX_TAGGING_CONTENT_CHARS = 6000;
const MAX_TAGS_PER_DIMENSION = 2;
const MAX_TOTAL_TAGS = 6;
const BLOCKED_TAG_SLUGS = new Set(["best-practice", "best-practices"]);

const dimensionSchema = z.enum(["techStack", "domain", "skillType"]);

const generatedTagSchema = z.object({
  matchScore: z.number().min(0).max(1),
  source: z.enum(["existing", "new"]),
  tag: z.string(),
});

const taggingOutputSchema = z.object({
  items: z.array(
    z.object({
      confidence: z.number().min(0).max(1),
      dimensions: z.object({
        domain: z.array(generatedTagSchema),
        skillType: z.array(generatedTagSchema),
        techStack: z.array(generatedTagSchema),
      }),
      key: z.string(),
      reason: z.string(),
    }),
  ),
});

export interface SkillTaggingInputItem {
  key: string;
  title?: string;
  description: string;
  content: string;
}

export interface NewTagCandidate {
  slug: string;
  matchScore: number;
  dimension: z.infer<typeof dimensionSchema>;
}

export interface SkillTaggingOutputItem {
  key: string;
  tags: string[];
  confidence: number;
  reason: string;
  newTagCandidates: NewTagCandidate[];
}

export const normalizeSkillTags = (tags: string[]) => {
  const normalized = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0)
    .map((tag) => tag.replaceAll(/\s+/g, "-"));
  const valid = normalized.filter((tag) => tagSlugSchema.safeParse(tag).success);
  return [...new Set(valid)];
};

const isBlockedTagSlug = (slug: string) => BLOCKED_TAG_SLUGS.has(slug);

const isDefinedTag = (
  value: { matchScore: number; slug: string; source: "existing" | "new" } | null,
): value is { matchScore: number; slug: string; source: "existing" | "new" } => value !== null;

const compressTaggingContent = (content: string) => {
  const trimmed = content.trim();
  if (trimmed.length <= MAX_TAGGING_CONTENT_CHARS) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_TAGGING_CONTENT_CHARS)}\n\n[content truncated for tagging]`;
};

const preferExistingTag = (
  tag: string,
  existingSet: Set<string>,
  byLooseKey: Map<string, string>,
) => {
  if (existingSet.has(tag)) {
    return tag;
  }

  return byLooseKey.get(tag.replaceAll("-", "")) ?? tag;
};

const resolveTaggingDeps = (deps?: {
  chat?: typeof chat;
  getAdapters: AiTaskRuntime["getAdapters"];
}) => {
  if (!deps?.getAdapters) {
    throw new Error("AI tagging runtime is unavailable.");
  }

  return {
    chat: deps.chat ?? chat,
    getAdapters: deps.getAdapters,
  };
};

export const generateSkillTagsBatch = async (
  input: {
    items: SkillTaggingInputItem[];
    existingTagCandidates?: string[];
  },
  deps?: {
    chat?: typeof chat;
    getAdapters: AiTaskRuntime["getAdapters"];
  },
) => {
  const resolvedDeps = resolveTaggingDeps(deps);
  const existingTagCandidates = normalizeSkillTags(input.existingTagCandidates ?? []).filter(
    (tag) => !isBlockedTagSlug(tag),
  );
  const existingSet = new Set(existingTagCandidates);
  const byLooseKey = new Map(
    existingTagCandidates.map((tag) => [tag.replaceAll("-", ""), tag] as const),
  );

  const existingTagsText =
    existingTagCandidates.length > 0 ? existingTagCandidates.join(", ") : "(none)";

  const systemPrompt = [
    "You are the taxonomy steward for agent skill tags.",
    "Goal: keep the tag system stable, low-entropy, and reusable.",
    "Output contract is strict JSON only. No prose, no preface, no markdown, no code fences.",
    "Tag semantics: describe only what the skill IS, never what it is used for.",
    "Use concise technical nouns (frameworks, protocols, platforms, domains, capability types).",
    "Never generate intent/outcome phrases like 'for beginners', 'automation', 'best-practice', 'how-to'.",
    "Forbidden tags: best-practice, best-practices.",
    "Taxonomy dimensions are fixed: techStack, domain, skillType.",
    "Each dimension must output 1-2 entries, and total tags must stay within 6.",
    "Prefer existing tags first. Reuse beats novelty.",
    "Only mark source='new' when no existing tag is a true semantic match.",
    "Canonicalization rule: if two tags represent the same concept, pick one canonical form only.",
    "Never split a single concept into variants (e.g. react and react-library).",
    "Avoid near-duplicates, plurals, suffix variants, or spelling variants.",
    "If uncertain between two close tags, choose the existing candidate.",
    "For each input item, keep key exactly unchanged from input.",
    "Return exactly one output item per input item.",
    "The first character of your response must be '{' and the last must be '}'.",
  ].join("\n");

  const userPrompt = `Skills:\n${input.items
    .map(
      (item) =>
        `- key: ${item.key}\n  title: ${item.title ?? ""}\n  description: ${item.description}\n  content: ${compressTaggingContent(item.content)}`,
    )
    .join(
      "\n\n",
    )}\n\nExisting tags (prefer reusing these): ${existingTagsText}\n\nRules:\n- tags must be lowercase kebab-case\n- each tag entry must include: { tag, source, matchScore }\n- source must be existing or new\n- matchScore is 0..1 semantic fit confidence\n- each dimension (techStack/domain/skillType) must have 1-2 entries\n- avoid synonyms/duplicates across dimensions\n- do not invent or rewrite key; copy input key exactly\n- output items length must equal input skills length\n- forbidden tags: best-practice, best-practices\n- response must be pure JSON object only\n\nOutput shape exactly:\n{"items":[{"key":"<input key>","confidence":0.0,"reason":"<short reason>","dimensions":{"techStack":[{"tag":"<slug>","source":"existing","matchScore":0.99}],"domain":[{"tag":"<slug>","source":"existing","matchScore":0.99}],"skillType":[{"tag":"<slug>","source":"existing","matchScore":0.99}]}}]}`;

  const adapters = resolvedDeps.getAdapters("skill-tagging");
  let lastError: unknown = null;
  for (const adapter of adapters) {
    try {
      const output = await resolvedDeps.chat({
        adapter,
        maxTokens: 4096,
        messages: [{ content: userPrompt, role: "user" }],
        outputSchema: taggingOutputSchema,
        systemPrompts: [systemPrompt],
      });

      return {
        items: output.items.map((item): SkillTaggingOutputItem => {
          const selectedByDimension: Record<
            z.infer<typeof dimensionSchema>,
            { slug: string; source: "existing" | "new"; matchScore: number }[]
          > = {
            domain: [],
            skillType: [],
            techStack: [],
          };

          const pushDimensionTags = (dimension: z.infer<typeof dimensionSchema>) => {
            const tags = item.dimensions[dimension]
              .map((entry) => {
                const normalized = normalizeSkillTags([entry.tag]).at(0);
                if (!normalized) {
                  return null;
                }
                if (isBlockedTagSlug(normalized)) {
                  return null;
                }

                const canonical = preferExistingTag(normalized, existingSet, byLooseKey);
                if (isBlockedTagSlug(canonical)) {
                  return null;
                }
                const source: "existing" | "new" = existingSet.has(canonical) ? "existing" : "new";

                return {
                  matchScore: entry.matchScore,
                  slug: canonical,
                  source,
                };
              })
              .filter(isDefinedTag);

            const unique: {
              slug: string;
              source: "existing" | "new";
              matchScore: number;
            }[] = [];
            const seen = new Set<string>();
            for (const tag of tags) {
              if (seen.has(tag.slug)) {
                continue;
              }
              seen.add(tag.slug);
              unique.push(tag);
              if (unique.length >= MAX_TAGS_PER_DIMENSION) {
                break;
              }
            }

            selectedByDimension[dimension] = unique;
          };

          pushDimensionTags("techStack");
          pushDimensionTags("domain");
          pushDimensionTags("skillType");

          const tags: string[] = [];
          const newTagCandidates: NewTagCandidate[] = [];
          for (const dimension of ["techStack", "domain", "skillType"] as const) {
            for (const tag of selectedByDimension[dimension]) {
              if (tags.includes(tag.slug)) {
                continue;
              }
              if (tags.length >= MAX_TOTAL_TAGS) {
                break;
              }
              tags.push(tag.slug);
              if (tag.source === "new") {
                newTagCandidates.push({
                  dimension,
                  matchScore: tag.matchScore,
                  slug: tag.slug,
                });
              }
            }
          }

          return {
            confidence: item.confidence,
            key: item.key,
            newTagCandidates,
            reason: item.reason,
            tags,
          };
        }),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Tagging model call failed.");
};
