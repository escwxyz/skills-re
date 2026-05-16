import type { AiTaskRuntime } from "@skills-re/api/types";
import { runSkillsCategorizationPipeline } from "@skills-re/api/modules/categories/service";

export interface SkillsCategorizationWorkflowPayload {
  skillIds: string[];
}

export interface RunSkillsCategorizationWorkflowDeps {
  aiTasks?: AiTaskRuntime;
  runSkillsCategorizationPipeline?: typeof runSkillsCategorizationPipeline;
}

export const runSkillsCategorizationWorkflow = async (
  event: Readonly<{ payload: SkillsCategorizationWorkflowPayload }>,
  deps: RunSkillsCategorizationWorkflowDeps = {},
) => {
  const { skillIds } = event.payload;
  console.info("[skills-categorization] starting pipeline", {
    skillCount: skillIds.length,
    skillIds,
    hasAiTasks: !!deps.aiTasks,
  });

  const pipeline = deps.runSkillsCategorizationPipeline ?? runSkillsCategorizationPipeline;
  try {
    const result = await pipeline({ skillIds }, deps.aiTasks);
    console.info("[skills-categorization] pipeline completed", {
      skillCount: skillIds.length,
      updatedCount: result.updatedCount,
      failedCount: result.failedCount,
    });
    return result;
  } catch (error) {
    console.error("[skills-categorization] pipeline failed", {
      skillCount: skillIds.length,
      skillIds,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
