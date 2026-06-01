import type { WorkflowCreateBinding } from "@/lib/cloudflare/workflows";
import { enqueueWorkflow } from "@/lib/cloudflare/workflows";

export interface SnapshotRawFilesBackfillWorkflowPayload {
  batchSize?: number;
  lastSeenSkillId?: string;
  minSnapshotAgeMs?: number;
  repoName?: string;
  repoOwner?: string;
}

export interface SnapshotRawFilesBackfillWorkflowScheduler {
  enqueue(payload: SnapshotRawFilesBackfillWorkflowPayload): Promise<{ workId: string }>;
}

const createWorkflowInstanceId = () => `snapshot-raw-files-backfill-${crypto.randomUUID()}`;

type SnapshotRawFilesBackfillWorkflowEnv = Env & {
  SNAPSHOT_RAW_FILES_BACKFILL_WORKFLOW?: WorkflowCreateBinding<SnapshotRawFilesBackfillWorkflowPayload>;
};

export const getSnapshotRawFilesBackfillWorkflowScheduler = (
  env: SnapshotRawFilesBackfillWorkflowEnv,
): SnapshotRawFilesBackfillWorkflowScheduler | null => {
  const binding = env.SNAPSHOT_RAW_FILES_BACKFILL_WORKFLOW;
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
