import type { chat } from "@tanstack/ai";

export type AiTaskType = "skill-categorization" | "skill-tagging";

export type AiTaskAdapter = Parameters<typeof chat>[0]["adapter"];

export interface AiTaskRuntime {
  getAdapters(task: AiTaskType): AiTaskAdapter[];
}
