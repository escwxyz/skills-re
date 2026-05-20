import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import type { LatestSnapshotRawFilesBackfillRow } from "@skills-re/api/modules/snapshots/repo";

import type {
  SnapshotRawFilesBackfillWorkflowPayload,
  SnapshotRawFilesBackfillWorkflowScheduler,
} from "./snapshot-raw-files-backfill";

const DEFAULT_BATCH_SIZE = 5;
const MAX_BATCH_SIZE = 10;
const DEFAULT_MIN_SNAPSHOT_AGE_MS = 60 * 60 * 1000;

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface SnapshotRawFilesBackfillWorkflowDeps {
  fetchCommitSha: (input: { owner: string; ref: string; repo: string }) => Promise<string>;
  fetchSkillFilesForRoot: (input: {
    owner: string;
    repo: string;
    skillRootPath: string;
    tree: { path: string; sha: string; size?: number; type: "blob" | "tree" }[];
  }) => Promise<{ files: { content: string; path: string }[] }>;
  fetchTree: (input: {
    commitSha: string;
    owner: string;
    repo: string;
  }) => Promise<{ path: string; sha: string; size?: number; type: "blob" | "tree" }[]>;
  hasGithubToken: () => boolean;
  listLatestSnapshotsForRawFilesBackfill: (input: {
    batchSize: number;
    lastSeenSkillId?: string;
    maxSyncTime?: number;
    repoName?: string;
    repoOwner?: string;
  }) => Promise<LatestSnapshotRawFilesBackfillRow[]>;
  runUploadSnapshotFilesPipeline: (input: {
    files: { content: string; path: string }[];
    snapshotId: string;
  }) => Promise<unknown>;
  scheduleContinuation?: SnapshotRawFilesBackfillWorkflowScheduler | null;
}

const normalizeBatchSize = (value?: number) =>
  Math.max(1, Math.min(value ?? DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE));

const normalizeMinSnapshotAgeMs = (value?: number) =>
  Math.max(0, value ?? DEFAULT_MIN_SNAPSHOT_AGE_MS);

const normalizeCommitSha = async (
  deps: Pick<SnapshotRawFilesBackfillWorkflowDeps, "fetchCommitSha">,
  input: {
    owner: string;
    ref: string;
    repo: string;
  },
) => {
  if (input.ref.length === 40) {
    return input.ref;
  }

  return await deps.fetchCommitSha(input);
};

export const runSnapshotRawFilesBackfillWorkflow = async (
  event: Readonly<WorkflowEvent<SnapshotRawFilesBackfillWorkflowPayload>>,
  step: WorkflowStep,
  deps: SnapshotRawFilesBackfillWorkflowDeps,
) => {
  if (!deps.hasGithubToken()) {
    throw new Error("GitHub snapshot history is not configured.");
  }

  const batchSize = normalizeBatchSize(event.payload.batchSize);
  const minSnapshotAgeMs = normalizeMinSnapshotAgeMs(event.payload.minSnapshotAgeMs);
  const maxSyncTime = Date.now() - minSnapshotAgeMs;
  const { lastSeenSkillId, repoName, repoOwner } = event.payload;

  const rows = await step.do(
    `snapshot-raw-files-backfill-fetch-batch-lastSeenSkillId-${lastSeenSkillId ?? "start"}`,
    workflowStepRetryPolicy.snapshotRawFilesBackfillBatch,
    async () =>
      await deps.listLatestSnapshotsForRawFilesBackfill({
        batchSize,
        lastSeenSkillId,
        maxSyncTime,
        repoName,
        repoOwner,
      }),
  );

  const treeByRepoAndCommit = new Map<
    string,
    { path: string; sha: string; size?: number; type: "blob" | "tree" }[]
  >();

  for (const row of rows) {
    await step.do(
      `snapshot-raw-files-backfill-upload-${row.snapshotId}`,
      workflowStepRetryPolicy.snapshotRawFilesBackfillBatch,
      async () => {
        const commitSha = await normalizeCommitSha(deps, {
          owner: row.repoOwner,
          ref: row.sourceCommitSha,
          repo: row.repoName,
        });
        const treeCacheKey = `${row.repoOwner}/${row.repoName}@${commitSha}`;
        let tree = treeByRepoAndCommit.get(treeCacheKey);
        if (!tree) {
          tree = await deps.fetchTree({
            commitSha,
            owner: row.repoOwner,
            repo: row.repoName,
          });
          treeByRepoAndCommit.set(treeCacheKey, tree);
        }

        const filesResponse = await deps.fetchSkillFilesForRoot({
          owner: row.repoOwner,
          repo: row.repoName,
          skillRootPath: row.directoryPath,
          tree,
        });
        if (filesResponse.files.length === 0) {
          return {
            reason: "missing-skill-files",
            snapshotId: row.snapshotId,
            status: "skipped" as const,
          };
        }

        await deps.runUploadSnapshotFilesPipeline({
          files: filesResponse.files,
          snapshotId: row.snapshotId,
        });

        return {
          snapshotId: row.snapshotId,
          status: "uploaded" as const,
        };
      },
    );
  }

  const nextLastSeenSkillId = rows.at(-1)?.skillId;
  const hasMore = rows.length === batchSize && Boolean(nextLastSeenSkillId);

  if (hasMore && nextLastSeenSkillId && deps.scheduleContinuation) {
    await step.do(
      "snapshot-raw-files-backfill-enqueue-continuation",
      workflowStepRetryPolicy.snapshotRawFilesBackfillBatch,
      async () =>
        await deps.scheduleContinuation?.enqueue({
          batchSize,
          lastSeenSkillId: nextLastSeenSkillId,
          minSnapshotAgeMs,
          repoName,
          repoOwner,
        }),
    );
  }

  return {
    hasMore,
    lastSeenSkillId: nextLastSeenSkillId ?? null,
    processed: rows.length,
    repoName: repoName ?? null,
    repoOwner: repoOwner ?? null,
    targetSnapshotIds: rows.map((row) => row.snapshotId),
  };
};
