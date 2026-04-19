import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import { reposService } from "@skills-re/api/modules/repos/service";

import type { RepoSnapshotSyncWorkflowPayload } from "./repo-snapshot-sync";

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface RepoSnapshotSyncWorkflowDeps {
  syncRepoSnapshots: typeof reposService.syncRepoSnapshots;
}

const defaultDeps: RepoSnapshotSyncWorkflowDeps = {
  syncRepoSnapshots: reposService.syncRepoSnapshots,
};

export const runRepoSnapshotSyncWorkflow = async (
  event: Readonly<WorkflowEvent<RepoSnapshotSyncWorkflowPayload>>,
  step: WorkflowStep,
  deps: Partial<RepoSnapshotSyncWorkflowDeps> = {},
) => {
  const activeDeps = {
    ...defaultDeps,
    ...deps,
  };

  return await step.do(
    "sync-repo-snapshots",
    workflowStepRetryPolicy.repoSnapshotSync,
    async () => await activeDeps.syncRepoSnapshots(event.payload),
  );
};
