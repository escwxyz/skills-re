import { enqueueWorkflow, getWorkflowBinding } from "@/lib/cloudflare/workflows";

export interface StaticAuditBackfillWorkflowPayload {
  batchSize?: number;
  minSnapshotAgeMs?: number;
}

export interface StaticAuditBackfillWorkflowScheduler {
  enqueue(payload: StaticAuditBackfillWorkflowPayload): Promise<{ workId: string }>;
}

const createWorkflowInstanceId = () => `static-audit-backfill-${crypto.randomUUID()}`;

const getWorkflowScheduler = (): StaticAuditBackfillWorkflowScheduler | null => {
  const binding = getWorkflowBinding<StaticAuditBackfillWorkflowPayload>(
    "STATIC_AUDIT_BACKFILL_WORKFLOW",
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

export const getDefaultStaticAuditBackfillWorkflowScheduler = () => getWorkflowScheduler();
