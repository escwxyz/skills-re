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
  scheduleSkillSummary?: (input: { snapshotId: string }) => Promise<unknown>;
}

export const runSnapshotUploadWorkflow = async (
  event: Readonly<WorkflowEvent<SnapshotUploadWorkflowPayload>>,
  step: WorkflowStep,
  deps: SnapshotUploadWorkflowDeps,
) => {
  const result = await step.do(
    "upload-snapshot-files",
    workflowStepRetryPolicy.snapshotUpload,
    async () => {
      const uploadPayload = await loadStagedSnapshotUploadPayload(event.payload);
      await deps.runUploadSnapshotFiles(uploadPayload);

      return {
        filesCount: uploadPayload.files.length,
        snapshotId: uploadPayload.snapshotId,
        status: "uploaded",
      } as const;
    },
  );

  const { scheduleSkillSummary } = deps;

  if (scheduleSkillSummary) {
    await step.do(
      "trigger-skill-summary",
      workflowStepRetryPolicy.repoSnapshotEnqueue,
      async () => {
        await scheduleSkillSummary({ snapshotId: result.snapshotId });
      },
    );
  }

  return result;
};
