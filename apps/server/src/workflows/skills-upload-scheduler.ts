import type { SkillsUploadScheduler } from "@skills-re/api/types";
import { nanoid } from "nanoid";

interface WorkflowCreateBinding<TPayload> {
  create: (options?: { id?: string; params?: TPayload }) => Promise<{ id: string }>;
}

type SkillsUploadWorkflowEnv = Env & {
  SKILLS_UPLOAD_WORKFLOW?: WorkflowCreateBinding<unknown>;
};

const createWorkflowInstanceId = () => `skills-upload-${nanoid()}`;

export const createSkillsUploadWorkflowScheduler = (
  binding: WorkflowCreateBinding<unknown>,
): SkillsUploadScheduler => ({
  async enqueue(payload) {
    const instance = await binding.create({
      id: createWorkflowInstanceId(),
      params: payload,
    });

    return { workId: instance.id };
  },
});

export const getSkillsUploadWorkflowScheduler = (
  env: SkillsUploadWorkflowEnv,
): SkillsUploadScheduler | null => {
  const binding = env.SKILLS_UPLOAD_WORKFLOW;
  return binding ? createSkillsUploadWorkflowScheduler(binding) : null;
};
