import { z } from "zod/v4";

import type { SnapshotUploadScheduler } from "@skills-re/api/types";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";

const snapshotUploadContentPayloadSchema = z.object({
  files: z.array(
    z.object({
      content: z.string(),
      path: z.string(),
    }),
  ),
  snapshotId: z.string().min(1),
});

export interface SnapshotUploadContentPayload {
  snapshotId: string;
  files: {
    content: string;
    path: string;
  }[];
}

export interface SnapshotUploadWorkflowStagingPayload {
  stagingKey: string;
}

export type SnapshotUploadWorkflowPayload =
  | SnapshotUploadWorkflowStagingPayload
  | SnapshotUploadContentPayload;

type SnapshotUploadWorkflowEnv = Env & {
  SNAPSHOT_UPLOAD_WORKFLOW?: WorkflowCreateBinding<SnapshotUploadWorkflowPayload>;
};

const isStagingPayload = (
  input: SnapshotUploadWorkflowPayload,
): input is SnapshotUploadWorkflowStagingPayload =>
  typeof (input as { stagingKey?: unknown }).stagingKey === "string";

export const getSnapshotUploadStagingKey = (input: SnapshotUploadWorkflowPayload) =>
  isStagingPayload(input) ? input.stagingKey : null;

export const loadStagedSnapshotUploadPayload = (
  input: SnapshotUploadWorkflowPayload,
): Promise<SnapshotUploadContentPayload> => {
  if (!isStagingPayload(input)) {
    const inlineValidated = snapshotUploadContentPayloadSchema.safeParse(input);
    if (!inlineValidated.success) {
      return Promise.reject(
        new Error("[snapshot-upload:validate-inline-payload] invalid legacy payload shape"),
      );
    }
    return Promise.resolve(inlineValidated.data);
  }

  return Promise.reject(new Error("Snapshot upload staging is not configured."));
};

export const cleanupStagedSnapshotUploadPayload = (_input: SnapshotUploadWorkflowPayload) => {
  void _input;
};

export const getSnapshotUploadWorkflowScheduler = (
  env: SnapshotUploadWorkflowEnv,
): SnapshotUploadScheduler | null => {
  const binding = env.SNAPSHOT_UPLOAD_WORKFLOW;
  return binding ? makeWorkflowScheduler("snapshot-upload", binding) : null;
};
