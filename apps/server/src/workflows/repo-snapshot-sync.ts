import { nanoid } from "nanoid";

import type { RepoSnapshotSyncScheduler } from "@skills-re/api/types";

interface WorkflowCreateBinding<TPayload> {
  create: (options?: { id?: string; params?: TPayload }) => Promise<{ id: string }>;
}

export interface RepoSnapshotSyncWorkflowPayload {
  expectedUpdatedAt?: number;
  repoName: string;
  repoOwner: string;
}

type RepoSnapshotSyncWorkflowEnv = Env & {
  REPO_SNAPSHOT_SYNC_WORKFLOW?: WorkflowCreateBinding<RepoSnapshotSyncWorkflowPayload>;
};

const createWorkflowInstanceId = () => `repo-snapshot-sync-${nanoid()}`;

export const createRepoSnapshotSyncWorkflowScheduler = (
  binding: WorkflowCreateBinding<RepoSnapshotSyncWorkflowPayload>,
): RepoSnapshotSyncScheduler => ({
  async enqueue(payload) {
    const instance = await binding.create({
      id: createWorkflowInstanceId(),
      params: payload,
    });

    return { workId: instance.id };
  },
});

export const getRepoSnapshotSyncWorkflowScheduler = (
  env: RepoSnapshotSyncWorkflowEnv,
): RepoSnapshotSyncScheduler | null => {
  const binding = env.REPO_SNAPSHOT_SYNC_WORKFLOW;
  return binding ? createRepoSnapshotSyncWorkflowScheduler(binding) : null;
};
