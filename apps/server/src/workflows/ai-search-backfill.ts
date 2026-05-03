import { enqueueWorkflow, getWorkflowBinding } from "@/lib/cloudflare/workflows";

export interface AiSearchBackfillWorkflowPayload {
  batchSize?: number;
  offset?: number;
}

export interface AiSearchBackfillWorkflowScheduler {
  enqueue(payload: AiSearchBackfillWorkflowPayload): Promise<{ workId: string }>;
}

const createWorkflowInstanceId = () => `ai-search-backfill-${crypto.randomUUID()}`;

const getWorkflowScheduler = (): AiSearchBackfillWorkflowScheduler | null => {
  const binding = getWorkflowBinding<AiSearchBackfillWorkflowPayload>(
    "AI_SEARCH_BACKFILL_WORKFLOW",
  );
  if (!binding) {
    return null;
  }

  return {
    async enqueue(payload) {
      return await enqueueWorkflow({
        binding,
        id: createWorkflowInstanceId(),
        payload,
      });
    },
  };
};

export const getAiSearchBackfillWorkflowScheduler = () => getWorkflowScheduler();
