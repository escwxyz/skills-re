import type { SnapshotArchiveUploadScheduler } from "@skills-re/api/types";
import { nanoid } from "nanoid";

import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";
import { enqueueQueueMessage, getDeterministicQueueDelaySeconds } from "../lib/cloudflare/queues";
import type { QueueBinding } from "../lib/cloudflare/queues";
import type { WorkflowQueueMessage } from "../queues/workflow-queue";

export interface SnapshotArchiveUploadWorkflowPayload {
  snapshotId: string;
}

type SnapshotArchiveUploadWorkflowEnv = Env & {
  SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
  SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW?: WorkflowCreateBinding<SnapshotArchiveUploadWorkflowPayload>;
};

const SNAPSHOT_ARCHIVE_UPLOAD_QUEUE_SPREAD_SECONDS = 120;

export const getSnapshotsArchiveUploadWorkflowScheduler = (
  env: SnapshotArchiveUploadWorkflowEnv,
): SnapshotArchiveUploadScheduler | null => {
  const binding = env.SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW;
  const queueBinding = env.SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW_QUEUE;
  if (!binding && !queueBinding) {
    return null;
  }

  return {
    async enqueue(payload) {
      const workflowId = `snapshot-archive-upload-${nanoid()}`;

      if (queueBinding) {
        await enqueueQueueMessage({
          binding: queueBinding,
          context: "snapshot-archive-upload",
          delaySeconds: getDeterministicQueueDelaySeconds({
            seed: payload.snapshotId,
            spreadSeconds: SNAPSHOT_ARCHIVE_UPLOAD_QUEUE_SPREAD_SECONDS,
          }),
          message: {
            kind: "snapshot-archive-upload",
            payload,
            workflowId,
          },
        });
        return { workId: workflowId };
      }

      if (!binding) {
        throw new Error("Snapshot archive upload workflow is not configured.");
      }

      return await makeWorkflowScheduler("snapshot-archive-upload", binding).enqueue(payload);
    },
  };
};
