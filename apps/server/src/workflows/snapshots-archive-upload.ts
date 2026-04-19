import type { SnapshotArchiveUploadScheduler } from "@skills-re/api/types";
import { nanoid } from "nanoid";

interface WorkflowCreateBinding<TPayload> {
  create: (options?: { id?: string; params?: TPayload }) => Promise<{ id: string }>;
}

export interface SnapshotArchiveUploadWorkflowPayload {
  snapshotId: string;
}

type SnapshotArchiveUploadWorkflowEnv = Env & {
  SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW?: WorkflowCreateBinding<SnapshotArchiveUploadWorkflowPayload>;
};

const createWorkflowInstanceId = () => `snapshot-archive-upload-${nanoid()}`;

export const createSnapshotArchiveUploadWorkflowScheduler = (
  binding: WorkflowCreateBinding<SnapshotArchiveUploadWorkflowPayload>,
): SnapshotArchiveUploadScheduler => ({
  async enqueue(payload) {
    const instance = await binding.create({
      id: createWorkflowInstanceId(),
      params: payload,
    });

    return { workId: instance.id };
  },
});

export const getSnapshotsArchiveUploadWorkflowScheduler = (
  env: SnapshotArchiveUploadWorkflowEnv,
): SnapshotArchiveUploadScheduler | null => {
  const binding = env.SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW;
  return binding ? createSnapshotArchiveUploadWorkflowScheduler(binding) : null;
};
