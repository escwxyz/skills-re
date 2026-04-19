import type { generateText } from "ai";

export type AiTaskType = "skill-categorization" | "skill-tagging";

export type AiTaskModel = Parameters<typeof generateText>[0]["model"];

export interface AiTaskRuntime {
  getModel(task: AiTaskType): AiTaskModel;
}
