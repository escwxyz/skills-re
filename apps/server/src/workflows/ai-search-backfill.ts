import { enqueueQueueMessage } from "@/lib/cloudflare/queues";
import type { QueueBinding } from "@/lib/cloudflare/queues";
import { enqueueWorkflow } from "@/lib/cloudflare/workflows";
import type { WorkflowQueueMessage } from "../queues/workflow-queue";

export interface AiSearchBackfillWorkflowPayload {
  batchSize?: number;
  lastSeenId?: string;
}

export interface AiSearchBackfillWorkflowEnqueueOptions {
  delaySeconds?: number;
}

export interface AiSearchBackfillWorkflowScheduler {
  enqueue(
    payload: AiSearchBackfillWorkflowPayload,
    options?: AiSearchBackfillWorkflowEnqueueOptions,
  ): Promise<{ workId: string }>;
}

const createWorkflowInstanceId = () => `ai-search-backfill-${crypto.randomUUID()}`;

type AiSearchBackfillWorkflowEnv = Env & {
  AI_SEARCH_BACKFILL_WORKFLOW?: {
    create: (input: {
      id: string;
      params: AiSearchBackfillWorkflowPayload;
    }) => Promise<{ id: string }>;
  };
  AI_SEARCH_BACKFILL_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
};

const createWorkflowScheduler = (
  binding: NonNullable<AiSearchBackfillWorkflowEnv["AI_SEARCH_BACKFILL_WORKFLOW"]>,
): AiSearchBackfillWorkflowScheduler => ({
  async enqueue(payload) {
    return await enqueueWorkflow({
      binding,
      id: createWorkflowInstanceId(),
      payload,
    });
  },
});

const createQueueScheduler = (
  binding: NonNullable<AiSearchBackfillWorkflowEnv["AI_SEARCH_BACKFILL_WORKFLOW_QUEUE"]>,
): AiSearchBackfillWorkflowScheduler => ({
  async enqueue(payload, options) {
    const workflowId = createWorkflowInstanceId();
    await enqueueQueueMessage({
      binding,
      context: "ai-search-backfill",
      delaySeconds: options?.delaySeconds,
      message: {
        kind: "ai-search-backfill",
        payload,
        workflowId,
      },
    });
    return { workId: workflowId };
  },
});

const getWorkflowScheduler = (
  env: AiSearchBackfillWorkflowEnv,
): AiSearchBackfillWorkflowScheduler | null => {
  const binding = env.AI_SEARCH_BACKFILL_WORKFLOW ?? null;
  const queueBinding = env.AI_SEARCH_BACKFILL_WORKFLOW_QUEUE ?? null;

  if (queueBinding) {
    return createQueueScheduler(queueBinding);
  }

  if (binding) {
    return createWorkflowScheduler(binding);
  }

  return null;
};

export const getAiSearchBackfillWorkflowScheduler = (env: AiSearchBackfillWorkflowEnv) =>
  getWorkflowScheduler(env);
