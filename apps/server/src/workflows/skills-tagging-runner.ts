import type { AiTaskRuntime } from "@skills-re/api/types";
import { runSkillsTaggingPipeline } from "@skills-re/api/modules/tags/service";

export interface SkillsTaggingWorkflowPayload {
  skillIds: string[];
  triggerCategorizationAfterTagging?: boolean;
}

interface WorkflowCreateBinding<TPayload> {
  create: (options?: { id?: string; params?: TPayload }) => Promise<{ id: string }>;
}

type SkillsCategorizationWorkflowBinding = WorkflowCreateBinding<{
  skillIds: string[];
}>;

export interface RunSkillsTaggingWorkflowDeps {
  aiTasks?: AiTaskRuntime;
  runSkillsTaggingPipeline?: typeof runSkillsTaggingPipeline;
  scheduleCategorization?: (input: { skillIds: string[] }) => Promise<{ workId: string }>;
}

const createWorkflowInstanceId = () => `skills-categorization-${crypto.randomUUID()}`;

export const runSkillsTaggingWorkflow = async (
  event: Readonly<{ payload: SkillsTaggingWorkflowPayload }>,
  deps: RunSkillsTaggingWorkflowDeps = {},
) => {
  const pipeline = deps.runSkillsTaggingPipeline ?? runSkillsTaggingPipeline;
  const result = await pipeline(
    {
      skillIds: event.payload.skillIds,
    },
    deps.aiTasks,
  );

  if (event.payload.triggerCategorizationAfterTagging) {
    if (!deps.scheduleCategorization) {
      throw new Error(
        "Skills categorization workflow binding is unavailable. Configure SKILLS_CATEGORIZATION_WORKFLOW.",
      );
    }

    await deps.scheduleCategorization({
      skillIds: event.payload.skillIds,
    });
  }

  return result;
};

export const createCategorizationWorkflowScheduler = (
  binding?: SkillsCategorizationWorkflowBinding,
) => {
  if (!binding) {
    return;
  }

  return async (input: { skillIds: string[] }) => {
    const instance = await binding.create({
      id: createWorkflowInstanceId(),
      params: input,
    });
    return { workId: instance.id };
  };
};
