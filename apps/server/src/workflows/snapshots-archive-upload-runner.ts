import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";

import type { SnapshotArchiveUploadWorkflowPayload } from "./snapshots-archive-upload";

export interface SnapshotsArchiveUploadWorkflowDeps {
  snapshotsService: {
    createSnapshotArchiveStaging: (input: { snapshotId: string }) => Promise<{
      archiveBytes: number;
      archiveKey: string;
      filesCount: number;
      snapshotId: string;
      stagingKey: string;
    }>;
    uploadSnapshotArchiveFromStaging: (input: {
      archiveBytes: number;
      archiveKey: string;
      filesCount: number;
      snapshotId: string;
      stagingKey: string;
    }) => Promise<{
      archiveBytes: number;
      archiveKey: string;
      filesCount: number;
      snapshotId: string;
    }>;
  };
}

interface SnapshotsArchiveUploadWorkflowDepsOverride {
  snapshotsService?: Partial<SnapshotsArchiveUploadWorkflowDeps["snapshotsService"]>;
}

const defaultDeps: SnapshotsArchiveUploadWorkflowDeps = {
  snapshotsService: {
    createSnapshotArchiveStaging: () =>
      Promise.reject(new Error("Snapshot archive staging pipeline is unavailable.")),
    uploadSnapshotArchiveFromStaging: () =>
      Promise.reject(new Error("Snapshot archive upload pipeline is unavailable.")),
  },
};

export const runSnapshotArchiveUploadWorkflow = async (
  event: Readonly<WorkflowEvent<SnapshotArchiveUploadWorkflowPayload>>,
  step: WorkflowStep,
  deps: SnapshotsArchiveUploadWorkflowDepsOverride = {},
) => {
  const activeDeps = {
    ...defaultDeps,
    snapshotsService: {
      ...defaultDeps.snapshotsService,
      ...deps.snapshotsService,
    },
  };

  const stagedArchive = await step.do(
    "create-snapshot-archive",
    workflowStepRetryPolicy.snapshotArchiveUpload,
    async () => await activeDeps.snapshotsService.createSnapshotArchiveStaging(event.payload),
  );

  return await step.do(
    "upload-snapshot-archive",
    workflowStepRetryPolicy.snapshotArchiveUpload,
    async () => await activeDeps.snapshotsService.uploadSnapshotArchiveFromStaging(stagedArchive),
  );
};
