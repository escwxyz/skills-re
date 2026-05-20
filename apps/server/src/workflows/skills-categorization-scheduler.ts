import { nanoid } from "nanoid";

import { enqueueQueueMessage, getDeterministicQueueDelaySeconds } from "../lib/cloudflare/queues";
import type { QueueBinding } from "../lib/cloudflare/queues";
import type { WorkflowQueueMessage } from "../queues/workflow-queue";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";

export interface SkillsCategorizationScheduler {
  enqueue(input: { skillIds: string[] }): Promise<{ workId: string }>;
}

type SkillsCategorizationWorkflowEnv = Env & {
  SKILLS_CATEGORIZATION_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
  SKILLS_CATEGORIZATION_WORKFLOW?: WorkflowCreateBinding<{
    skillIds: string[];
  }>;
};

const SKILLS_CATEGORIZATION_QUEUE_SPREAD_SECONDS = 45;

export const getSkillsCategorizationWorkflowScheduler = (
  env: SkillsCategorizationWorkflowEnv,
): SkillsCategorizationScheduler | null => {
  const binding = env.SKILLS_CATEGORIZATION_WORKFLOW;
  const queueBinding = env.SKILLS_CATEGORIZATION_WORKFLOW_QUEUE;
  if (!binding && !queueBinding) {
    return null;
  }

  return {
    async enqueue(payload) {
      const workflowId = `skills-categorization-${nanoid()}`;

      if (queueBinding) {
        await enqueueQueueMessage({
          binding: queueBinding,
          context: "skills-categorization",
          delaySeconds: getDeterministicQueueDelaySeconds({
            seed: payload.skillIds.join(","),
            spreadSeconds: SKILLS_CATEGORIZATION_QUEUE_SPREAD_SECONDS,
          }),
          message: {
            kind: "skills-categorization",
            payload,
            workflowId,
          },
        });
        return { workId: workflowId };
      }

      if (!binding) {
        throw new Error("Skills categorization workflow is not configured.");
      }

      return await makeWorkflowScheduler("skills-categorization", binding).enqueue(payload);
    },
  };
};
