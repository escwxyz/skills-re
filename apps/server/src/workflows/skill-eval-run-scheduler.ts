import { nanoid } from "nanoid";

import type { SkillEvalRunScheduler } from "@skills-re/api/types";

import { enqueueQueueMessage } from "../lib/cloudflare/queues";
import type { QueueBinding } from "../lib/cloudflare/queues";

interface SkillEvalRunWorkflowQueueMessage {
  kind: "skill-eval-run";
  payload: {
    includeBaseline: boolean;
    runId: string;
  };
  workflowId: string;
}

type SkillEvalRunWorkflowEnv = Env & {
  SKILL_EVAL_RUN_WORKFLOW_QUEUE?: QueueBinding<SkillEvalRunWorkflowQueueMessage>;
};

export const getSkillEvalRunWorkflowScheduler = (
  env: SkillEvalRunWorkflowEnv,
): SkillEvalRunScheduler | null => {
  const queueBinding = env.SKILL_EVAL_RUN_WORKFLOW_QUEUE;
  if (!queueBinding) {
    return null;
  }

  return {
    async enqueue(payload) {
      const workflowId = `skill-eval-run-${nanoid()}`;
      await enqueueQueueMessage({
        binding: queueBinding,
        context: "skill-eval-run",
        message: {
          kind: "skill-eval-run",
          payload,
          workflowId,
        },
      });
      return { workId: workflowId };
    },
  };
};
