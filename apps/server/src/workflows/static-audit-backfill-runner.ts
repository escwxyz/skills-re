import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import { staticAuditsService } from "@skills-re/api/modules/static-audits/service";
import type { StaticAuditBackfillWorkflowPayload } from "./static-audit-backfill";

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface StaticAuditBackfillWorkflowDeps {
  dispatchMissingSnapshotAuditsBatch: typeof staticAuditsService.dispatchMissingSnapshotAuditsBatch;
}

const defaultDeps: StaticAuditBackfillWorkflowDeps = {
  dispatchMissingSnapshotAuditsBatch: staticAuditsService.dispatchMissingSnapshotAuditsBatch,
};

export const runStaticAuditBackfillWorkflow = async (
  event: Readonly<WorkflowEvent<StaticAuditBackfillWorkflowPayload>>,
  step: WorkflowStep,
  deps: Partial<StaticAuditBackfillWorkflowDeps> = {},
) => {
  const activeDeps = {
    ...defaultDeps,
    ...deps,
  };

  return await step.do(
    "static-audit-backfill-dispatch",
    workflowStepRetryPolicy.staticAuditBackfillDispatch,
    async () =>
      await activeDeps.dispatchMissingSnapshotAuditsBatch({
        batchSize: event.payload.batchSize,
        minSnapshotAgeMs: event.payload.minSnapshotAgeMs,
      }),
  );
};
