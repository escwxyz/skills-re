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

export type SnapshotUploadWorkflowPayload = SnapshotUploadWorkflowStagingPayload;

export interface SnapshotUploadStagingReader {
  delete(key: string): Promise<void>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
}

export interface SnapshotUploadStagingBucket extends SnapshotUploadStagingReader {
  put(
    key: string,
    value: string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}

type SnapshotUploadWorkflowEnv = Env & {
  SNAPSHOT_FILES?: SnapshotUploadStagingBucket;
  SNAPSHOT_UPLOAD_WORKFLOW?: WorkflowCreateBinding<SnapshotUploadWorkflowPayload>;
};

export const getSnapshotUploadStagingKey = (input: SnapshotUploadWorkflowPayload) =>
  input.stagingKey;

const buildStagingKey = () => {
  const day = new Date().toISOString().slice(0, 10);
  return `snapshot-upload/staging/${day}/${crypto.randomUUID()}.json`;
};

export const stageSnapshotUploadPayload = async (
  bucket: SnapshotUploadStagingBucket,
  payload: SnapshotUploadContentPayload,
): Promise<SnapshotUploadWorkflowStagingPayload> => {
  const key = buildStagingKey();
  await bucket.put(key, JSON.stringify(payload), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return { stagingKey: key };
};

export const loadStagedSnapshotUploadPayload = async (
  bucket: SnapshotUploadStagingReader | null | undefined,
  input: SnapshotUploadWorkflowPayload,
): Promise<SnapshotUploadContentPayload> => {
  if (!bucket) {
    throw new Error("Snapshot upload staging is not configured.");
  }

  const object = await bucket.get(input.stagingKey);
  if (!object) {
    throw new Error("[snapshot-upload:load-from-r2] staging payload not found");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await object.text());
  } catch {
    throw new Error("[snapshot-upload:parse-staged-json] failed to parse JSON");
  }

  const validated = snapshotUploadContentPayloadSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("[snapshot-upload:validate-staged-payload] invalid payload shape");
  }

  return validated.data;
};

export const cleanupStagedSnapshotUploadPayload = async (
  bucket: SnapshotUploadStagingReader | null | undefined,
  input: SnapshotUploadWorkflowPayload,
) => {
  if (!bucket) {
    return;
  }

  await bucket.delete(input.stagingKey);
};

export const getSnapshotUploadWorkflowScheduler = (
  env: SnapshotUploadWorkflowEnv,
): SnapshotUploadScheduler | null => {
  const binding = env.SNAPSHOT_UPLOAD_WORKFLOW;
  if (!binding) {
    return null;
  }

  const bucket = env.SNAPSHOT_FILES;
  return {
    async enqueue(payload) {
      if (!bucket) {
        throw new Error("Snapshot upload staging is not configured.");
      }

      const stagedPayload = await stageSnapshotUploadPayload(bucket, payload);
      try {
        return await makeWorkflowScheduler("snapshot-upload", binding).enqueue(stagedPayload);
      } catch (error) {
        await cleanupStagedSnapshotUploadPayload(bucket, stagedPayload);
        throw error;
      }
    },
  };
};
