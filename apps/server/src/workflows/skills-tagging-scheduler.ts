import type { SkillsTaggingScheduler } from "@skills-re/api/types";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";

type SkillsTaggingWorkflowEnv = Env & {
  SKILLS_TAGGING_WORKFLOW?: WorkflowCreateBinding<{
    skillIds: string[];
    triggerCategorizationAfterTagging?: boolean;
  }>;
};

export const getSkillsTaggingWorkflowScheduler = (
  env: SkillsTaggingWorkflowEnv,
): SkillsTaggingScheduler | null => {
  const binding = env.SKILLS_TAGGING_WORKFLOW;
  return binding ? makeWorkflowScheduler("skills-tagging", binding) : null;
};
