import { enqueueQueueMessage } from "@/lib/cloudflare/queues";
import type { QueueBinding } from "@/lib/cloudflare/queues";
import { enqueueWorkflow } from "@/lib/cloudflare/workflows";
import type { WorkflowQueueMessage } from "../queues/workflow-queue";

export interface SkillSearchBackfillWorkflowPayload {
  batchSize?: number;
  cursor?: string;
  mode?: "backfill" | "repair";
}

export interface SkillSearchBackfillWorkflowEnqueueOptions {
  delaySeconds?: number;
}

export interface SkillSearchBackfillWorkflowScheduler {
  enqueue(
    payload: SkillSearchBackfillWorkflowPayload,
    options?: SkillSearchBackfillWorkflowEnqueueOptions,
  ): Promise<{ workId: string }>;
}

const createWorkflowInstanceId = () => `skill-search-backfill-${crypto.randomUUID()}`;

type SkillSearchBackfillWorkflowEnv = Env & {
  SKILL_SEARCH_BACKFILL_WORKFLOW?: {
    create: (input: {
      id: string;
      params: SkillSearchBackfillWorkflowPayload;
    }) => Promise<{ id: string }>;
  };
  SKILL_SEARCH_BACKFILL_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
};

const createWorkflowScheduler = (
  binding: NonNullable<SkillSearchBackfillWorkflowEnv["SKILL_SEARCH_BACKFILL_WORKFLOW"]>,
): SkillSearchBackfillWorkflowScheduler => ({
  async enqueue(payload) {
    return await enqueueWorkflow({
      binding,
      id: createWorkflowInstanceId(),
      payload,
    });
  },
});

const createQueueScheduler = (
  binding: NonNullable<SkillSearchBackfillWorkflowEnv["SKILL_SEARCH_BACKFILL_WORKFLOW_QUEUE"]>,
): SkillSearchBackfillWorkflowScheduler => ({
  async enqueue(payload, options) {
    const workflowId = createWorkflowInstanceId();
    await enqueueQueueMessage({
      binding,
      context: "skill-search-backfill",
      delaySeconds: options?.delaySeconds,
      message: {
        kind: "skill-search-backfill",
        payload,
        workflowId,
      },
    });
    return { workId: workflowId };
  },
});

export const getSkillSearchBackfillWorkflowScheduler = (
  env: SkillSearchBackfillWorkflowEnv,
): SkillSearchBackfillWorkflowScheduler | null => {
  const queueBinding = env.SKILL_SEARCH_BACKFILL_WORKFLOW_QUEUE ?? null;
  if (queueBinding) {
    return createQueueScheduler(queueBinding);
  }

  const binding = env.SKILL_SEARCH_BACKFILL_WORKFLOW ?? null;
  if (binding) {
    return createWorkflowScheduler(binding);
  }

  return null;
};
