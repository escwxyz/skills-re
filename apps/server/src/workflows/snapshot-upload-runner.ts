import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";

import { loadStagedSnapshotUploadPayload } from "./snapshot-upload";
import type { SnapshotUploadWorkflowPayload } from "./snapshot-upload";

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface SnapshotUploadWorkflowDeps {
  runUploadSnapshotFiles: (input: {
    files: { content: string; path: string }[];
    snapshotId: string;
  }) => Promise<unknown>;
}

const defaultDeps: SnapshotUploadWorkflowDeps = {
  runUploadSnapshotFiles: async () => {
    throw new Error("Snapshot upload pipeline is unavailable.");
  },
};

export const runSnapshotUploadWorkflow = async (
  event: Readonly<WorkflowEvent<SnapshotUploadWorkflowPayload>>,
  step: WorkflowStep,
  deps: Partial<SnapshotUploadWorkflowDeps> = {},
) => {
  const activeDeps = {
    ...defaultDeps,
    ...deps,
  };

  return await step.do(
    "upload-snapshot-files",
    workflowStepRetryPolicy.snapshotUpload,
    async () => {
      const uploadPayload = await loadStagedSnapshotUploadPayload(event.payload);
      await activeDeps.runUploadSnapshotFiles(uploadPayload);

      return {
        filesCount: uploadPayload.files.length,
        snapshotId: uploadPayload.snapshotId,
        status: "uploaded",
      } as const;
    },
  );
};
