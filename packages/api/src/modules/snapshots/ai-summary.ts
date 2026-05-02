import { chat } from "@tanstack/ai";
import { z } from "zod/v4";

import type { AiTaskRuntime } from "../ai/runtime";

const MAX_SUMMARY_CONTENT_CHARS = 8000;

const summaryOutputSchema = z.object({
  summary: z.string(),
});

const compressSummaryContent = (content: string) => {
  const trimmed = content.trim();
  if (trimmed.length <= MAX_SUMMARY_CONTENT_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_SUMMARY_CONTENT_CHARS)}\n\n[content truncated]`;
};

const resolveSummaryDeps = (deps?: {
  chat?: typeof chat;
  getAdapters: AiTaskRuntime["getAdapters"];
}) => {
  if (!deps?.getAdapters) {
    throw new Error("AI summary runtime is unavailable.");
  }
  return {
    chat: deps.chat ?? chat,
    getAdapters: deps.getAdapters,
  };
};

export const generateSkillSummary = async (
  input: {
    content: string;
    title?: string;
  },
  deps?: {
    chat?: typeof chat;
    getAdapters: AiTaskRuntime["getAdapters"];
  },
): Promise<string> => {
  const resolvedDeps = resolveSummaryDeps(deps);

  const systemPrompt = [
    "You are a technical writer summarizing agent skills for a skill library.",
    "Write a concise, accurate description of what the skill does and how it helps users.",
    "Focus on the skill's capabilities, use cases, and key behaviors.",
    "Write in third-person present tense. Maximum 2-3 sentences.",
    "Output contract is strict JSON only. No prose, no preface, no markdown, no code fences.",
    "The first character of your response must be '{' and the last must be '}'.",
  ].join("\n");

  const titleLine = input.title ? `Skill title: ${input.title}\n\n` : "";
  const userPrompt = `${titleLine}Skill content:\n${compressSummaryContent(input.content)}\n\nOutput shape exactly:\n{"summary":"<2-3 sentence description>"}`;

  const adapters = resolvedDeps.getAdapters("skill-summary");
  let lastError: unknown = null;
  for (const adapter of adapters) {
    try {
      const output = await resolvedDeps.chat({
        adapter,
        maxTokens: 256,
        messages: [{ content: userPrompt, role: "user" }],
        outputSchema: summaryOutputSchema,
        systemPrompts: [systemPrompt],
      });
      return output.summary;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("All AI summary adapters failed.");
};
