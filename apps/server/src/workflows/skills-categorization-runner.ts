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
  const pipeline = deps.runSkillsCategorizationPipeline ?? runSkillsCategorizationPipeline;
  return await pipeline(
    {
      skillIds: event.payload.skillIds,
    },
    deps.aiTasks,
  );
};
