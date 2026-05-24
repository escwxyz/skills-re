import type { LanguageModelV3 } from "@ai-sdk/provider";

export type AiTaskType = "skill-categorization" | "skill-tagging";

export interface AiTaskRuntime {
  getModels(task: AiTaskType): LanguageModelV3[];
}
