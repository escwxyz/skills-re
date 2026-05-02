import type { SkillSummaryScheduler } from "@skills-re/api/types";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";

export interface SkillSummaryWorkflowPayload {
  snapshotId: string;
}

type SkillSummaryWorkflowEnv = Env & {
  SKILL_SUMMARY_WORKFLOW?: WorkflowCreateBinding<SkillSummaryWorkflowPayload>;
};

export const getSkillSummaryWorkflowScheduler = (
  env: SkillSummaryWorkflowEnv,
): SkillSummaryScheduler | null => {
  const binding = env.SKILL_SUMMARY_WORKFLOW;
  return binding ? makeWorkflowScheduler("skill-summary", binding) : null;
};
