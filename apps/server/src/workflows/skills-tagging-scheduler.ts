import type { SkillsTaggingScheduler } from "@skills-re/api/types";
import { nanoid } from "nanoid";

import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";
import { enqueueQueueMessage, getDeterministicQueueDelaySeconds } from "../lib/cloudflare/queues";
import type { QueueBinding } from "../lib/cloudflare/queues";
import type { WorkflowQueueMessage } from "../queues/workflow-queue";

type SkillsTaggingWorkflowEnv = Env & {
  SKILLS_TAGGING_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
  SKILLS_TAGGING_WORKFLOW?: WorkflowCreateBinding<{
    skillIds: string[];
    triggerCategorizationAfterTagging?: boolean;
  }>;
};

const SKILLS_TAGGING_QUEUE_SPREAD_SECONDS = 45;

export const getSkillsTaggingWorkflowScheduler = (
  env: SkillsTaggingWorkflowEnv,
): SkillsTaggingScheduler | null => {
  const binding = env.SKILLS_TAGGING_WORKFLOW;
  const queueBinding = env.SKILLS_TAGGING_WORKFLOW_QUEUE;
  if (!binding && !queueBinding) {
    return null;
  }

  return {
    async enqueue(payload) {
      const workflowId = `skills-tagging-${nanoid()}`;

      if (queueBinding) {
        await enqueueQueueMessage({
          binding: queueBinding,
          context: "skills-tagging",
          delaySeconds: getDeterministicQueueDelaySeconds({
            seed: payload.skillIds.join(","),
            spreadSeconds: SKILLS_TAGGING_QUEUE_SPREAD_SECONDS,
          }),
          message: {
            kind: "skills-tagging",
            payload,
            workflowId,
          },
        });
        return { workId: workflowId };
      }

      if (!binding) {
        throw new Error("Skills tagging workflow is not configured.");
      }

      return await makeWorkflowScheduler("skills-tagging", binding).enqueue(payload);
    },
  };
};
