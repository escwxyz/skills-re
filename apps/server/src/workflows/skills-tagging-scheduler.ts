import type { SkillsTaggingScheduler } from "@skills-re/api/types";
import { nanoid } from "nanoid";

interface WorkflowCreateBinding<TPayload> {
  create: (options?: { id?: string; params?: TPayload }) => Promise<{ id: string }>;
}

type SkillsTaggingWorkflowEnv = Env & {
  SKILLS_TAGGING_WORKFLOW?: WorkflowCreateBinding<{
    skillIds: string[];
    triggerCategorizationAfterTagging?: boolean;
  }>;
};

const createWorkflowInstanceId = () => `skills-tagging-${nanoid()}`;

export const createSkillsTaggingWorkflowScheduler = (
  binding: WorkflowCreateBinding<{
    skillIds: string[];
    triggerCategorizationAfterTagging?: boolean;
  }>,
): SkillsTaggingScheduler => ({
  async enqueue(payload) {
    const instance = await binding.create({
      id: createWorkflowInstanceId(),
      params: payload,
    });

    return { workId: instance.id };
  },
});

export const getSkillsTaggingWorkflowScheduler = (
  env: SkillsTaggingWorkflowEnv,
): SkillsTaggingScheduler | null => {
  const binding = env.SKILLS_TAGGING_WORKFLOW;
  return binding ? createSkillsTaggingWorkflowScheduler(binding) : null;
};
