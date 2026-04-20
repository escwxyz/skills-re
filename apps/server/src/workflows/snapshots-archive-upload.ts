import type { SnapshotArchiveUploadScheduler } from "@skills-re/api/types";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";

export interface SnapshotArchiveUploadWorkflowPayload {
  snapshotId: string;
}

type SnapshotArchiveUploadWorkflowEnv = Env & {
  SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW?: WorkflowCreateBinding<SnapshotArchiveUploadWorkflowPayload>;
};

export const getSnapshotsArchiveUploadWorkflowScheduler = (
  env: SnapshotArchiveUploadWorkflowEnv,
): SnapshotArchiveUploadScheduler | null => {
  const binding = env.SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW;
  return binding ? makeWorkflowScheduler("snapshot-archive-upload", binding) : null;
};
