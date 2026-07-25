import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import type { SnapshotStorageRuntime } from "@skills-re/api/types";
import type {
  SkillSearchBackfillRow,
  listEligibleSkillSearchBackfillPage,
  listRepairableSkillSearchBackfillPage,
} from "@skills-re/api/modules/skills/search-documents-repo";
import type { replaceSkillSearchDocument } from "@skills-re/api/modules/skills/search-document-service";
import { asSkillId, asSnapshotId } from "@skills-re/db/utils";
import type {
  SkillSearchBackfillWorkflowPayload,
  SkillSearchBackfillWorkflowScheduler,
} from "./skill-search-backfill";

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;
const CONTINUATION_DELAY_SECONDS = 60;

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface SkillSearchBackfillWorkflowDeps {
  listEligibleSkillSearchBackfillPage: typeof listEligibleSkillSearchBackfillPage;
  listRepairableSkillSearchBackfillPage?: typeof listRepairableSkillSearchBackfillPage;
  replaceSkillSearchDocument: typeof replaceSkillSearchDocument;
  scheduleContinuation?: SkillSearchBackfillWorkflowScheduler | null;
  snapshotStorage: SnapshotStorageRuntime;
}

const normalizeBatchSize = (value?: number) =>
  Math.max(1, Math.min(value ?? DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE));

const toHex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const hashBytes = async (bytes: ArrayBuffer) => toHex(await crypto.subtle.digest("SHA-256", bytes));

const formatErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const createInitialCounts = () => ({
  failedCount: 0,
  hashMismatchCount: 0,
  indexedCount: 0,
  missingObjectCount: 0,
  oversizedCount: 0,
  skippedCount: 0,
  skippedStaleCount: 0,
});

const backfillSkillSearchDocument = async (
  row: SkillSearchBackfillRow,
  deps: SkillSearchBackfillWorkflowDeps,
) => {
  const object = await deps.snapshotStorage.getSnapshotFileObject(row.entryR2Key);
  if (!object) {
    return { status: "missing-object" as const };
  }

  const bytes = await object.arrayBuffer();
  const hash = await hashBytes(bytes);
  const actualHash = hash.toLowerCase();
  if (actualHash !== row.entryFileHash.toLowerCase()) {
    return { status: "hash-mismatch" as const };
  }

  const body = new TextDecoder().decode(bytes);
  const result = await deps.replaceSkillSearchDocument({
    authorHandle: row.authorHandle,
    body,
    contentHash: row.skillContentHash ?? row.entryFileHash,
    description: row.description,
    isPublic: true,
    repository: row.repoName,
    skillId: asSkillId(row.skillId),
    slug: row.skillSlug,
    snapshotId: asSnapshotId(row.snapshotId),
    title: row.title,
  });

  if (result.status === "skipped-stale") {
    return { status: "skipped-stale" as const };
  }

  return {
    indexingStatus: result.status === "replaced" ? result.indexingStatus : null,
    status: "indexed" as const,
  };
};

export const runSkillSearchBackfillWorkflow = async (
  event: Readonly<WorkflowEvent<SkillSearchBackfillWorkflowPayload>>,
  step: WorkflowStep,
  deps: SkillSearchBackfillWorkflowDeps,
) => {
  const { cursor, mode } = event.payload;
  const batchSize = normalizeBatchSize(event.payload.batchSize);
  const listPage =
    mode === "repair" && deps.listRepairableSkillSearchBackfillPage
      ? deps.listRepairableSkillSearchBackfillPage
      : deps.listEligibleSkillSearchBackfillPage;

  const page = await step.do(
    `skill-search-${mode ?? "backfill"}-fetch-batch-${cursor ?? "start"}`,
    workflowStepRetryPolicy.skillSearchBackfillBatch,
    async () =>
      await listPage({
        cursor,
        limit: batchSize,
      }),
  );

  const counts = createInitialCounts();

  for (const row of page.page) {
    try {
      const result = await step.do(
        `skill-search-backfill-index-${row.skillId}`,
        workflowStepRetryPolicy.skillSearchBackfillBatch,
        async () => await backfillSkillSearchDocument(row, deps),
      );

      if (result.status === "missing-object") {
        counts.missingObjectCount += 1;
        counts.skippedCount += 1;
      } else if (result.status === "hash-mismatch") {
        counts.hashMismatchCount += 1;
        counts.skippedCount += 1;
      } else if (result.status === "skipped-stale") {
        counts.skippedStaleCount += 1;
        counts.skippedCount += 1;
      } else {
        counts.indexedCount += 1;
        if (result.indexingStatus === "truncated") {
          counts.oversizedCount += 1;
        }
      }
    } catch (error) {
      counts.failedCount += 1;
      console.warn("[skill-search-backfill] failed to index search document", {
        error: formatErrorMessage(error),
        skillId: row.skillId,
        snapshotId: row.snapshotId,
      });
    }
  }

  if (!page.isDone && page.continueCursor && deps.scheduleContinuation) {
    await step.do(
      "enqueue-skill-search-backfill-continuation",
      workflowStepRetryPolicy.skillSearchBackfillBatch,
      async () =>
        await deps.scheduleContinuation?.enqueue(
          {
            batchSize,
            cursor: page.continueCursor,
            mode,
          },
          {
            delaySeconds: CONTINUATION_DELAY_SECONDS,
          },
        ),
    );
  }

  return {
    ...counts,
    continueCursor: page.continueCursor,
    isDone: page.isDone,
    processedCount: page.page.length,
  };
};
