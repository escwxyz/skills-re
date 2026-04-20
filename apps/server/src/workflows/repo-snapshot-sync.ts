import type { RepoSnapshotSyncScheduler } from "@skills-re/api/types";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";

export interface RepoSnapshotSyncWorkflowPayload {
  expectedUpdatedAt?: number;
  repoName: string;
  repoOwner: string;
}

type RepoSnapshotSyncWorkflowEnv = Env & {
  REPO_SNAPSHOT_SYNC_WORKFLOW?: WorkflowCreateBinding<RepoSnapshotSyncWorkflowPayload>;
};

export const getRepoSnapshotSyncWorkflowScheduler = (
  env: RepoSnapshotSyncWorkflowEnv,
): RepoSnapshotSyncScheduler | null => {
  const binding = env.REPO_SNAPSHOT_SYNC_WORKFLOW;
  return binding ? makeWorkflowScheduler("repo-snapshot-sync", binding) : null;
};
