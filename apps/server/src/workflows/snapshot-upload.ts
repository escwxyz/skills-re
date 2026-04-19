import { z } from "zod/v4";

import type { SnapshotUploadScheduler } from "@skills-re/api/types";
import { nanoid } from "nanoid";

interface WorkflowCreateBinding<TPayload> {
  create: (options?: { id?: string; params?: TPayload }) => Promise<{ id: string }>;
}

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

const createWorkflowInstanceId = () => `snapshot-upload-${nanoid()}`;

const isStagingPayload = (
  input: SnapshotUploadWorkflowPayload,
): input is SnapshotUploadWorkflowStagingPayload =>
  typeof (input as { stagingKey?: unknown }).stagingKey === "string";

export const getSnapshotUploadStagingKey = (input: SnapshotUploadWorkflowPayload) =>
  isStagingPayload(input) ? input.stagingKey : null;

export const loadStagedSnapshotUploadPayload = async (
  input: SnapshotUploadWorkflowPayload,
): Promise<SnapshotUploadContentPayload> => {
  if (!isStagingPayload(input)) {
    const inlineValidated = snapshotUploadContentPayloadSchema.safeParse(input);
    if (!inlineValidated.success) {
      throw new Error("[snapshot-upload:validate-inline-payload] invalid legacy payload shape");
    }
    return inlineValidated.data;
  }

  throw new Error("Snapshot upload staging is not configured.");
};

export const cleanupStagedSnapshotUploadPayload = async (_input: SnapshotUploadWorkflowPayload) => {
  return;
};

export const createSnapshotUploadWorkflowScheduler = (
  binding: WorkflowCreateBinding<SnapshotUploadWorkflowPayload>,
): SnapshotUploadScheduler => ({
  async enqueue(payload) {
    const instance = await binding.create({
      id: createWorkflowInstanceId(),
      params: payload,
    });

    return { workId: instance.id };
  },
});

export const getSnapshotUploadWorkflowScheduler = (
  env: SnapshotUploadWorkflowEnv,
): SnapshotUploadScheduler | null => {
  const binding = env.SNAPSHOT_UPLOAD_WORKFLOW;
  return binding ? createSnapshotUploadWorkflowScheduler(binding) : null;
};
