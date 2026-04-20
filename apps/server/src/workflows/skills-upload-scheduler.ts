import type { SkillsUploadScheduler } from "@skills-re/api/types";
import type { SkillsUploadWorkflowPayload } from "./skills-upload";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";

type SkillsUploadWorkflowEnv = Env & {
  SKILLS_UPLOAD_WORKFLOW?: WorkflowCreateBinding<SkillsUploadWorkflowPayload>;
};

export const getSkillsUploadWorkflowScheduler = (
  env: SkillsUploadWorkflowEnv,
): SkillsUploadScheduler | null => {
  const binding = env.SKILLS_UPLOAD_WORKFLOW;
  return binding ? makeWorkflowScheduler("skills-upload", binding) : null;
};
