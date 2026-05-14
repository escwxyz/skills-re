import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";

import {
  cleanupStagedSnapshotUploadPayload,
  loadStagedSnapshotUploadPayload,
} from "./snapshot-upload";
import type { SnapshotUploadStagingReader, SnapshotUploadWorkflowPayload } from "./snapshot-upload";

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface SnapshotUploadWorkflowDeps {
  snapshotFilesBucket?: SnapshotUploadStagingReader | null;
  runUploadSnapshotFiles: (input: {
    files: { content: string; path: string }[];
    snapshotId: string;
  }) => Promise<unknown>;
}

export const runSnapshotUploadWorkflow = (
  event: Readonly<WorkflowEvent<SnapshotUploadWorkflowPayload>>,
  step: WorkflowStep,
  deps: SnapshotUploadWorkflowDeps,
) =>
  step.do("upload-snapshot-files", workflowStepRetryPolicy.snapshotUpload, async () => {
    try {
      const uploadPayload = await loadStagedSnapshotUploadPayload(
        deps.snapshotFilesBucket,
        event.payload,
      );
      await deps.runUploadSnapshotFiles(uploadPayload);

      return {
        filesCount: uploadPayload.files.length,
        snapshotId: uploadPayload.snapshotId,
        status: "uploaded",
      } as const;
    } finally {
      await cleanupStagedSnapshotUploadPayload(deps.snapshotFilesBucket, event.payload);
    }
  });
