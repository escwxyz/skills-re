import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import type { AiSearchItemsRuntime, SnapshotStorageRuntime } from "@skills-re/api/types";
import type {
  AiSearchBackfillWorkflowPayload,
  AiSearchBackfillWorkflowScheduler,
} from "./ai-search-backfill";
import type { AiSearchBackfillRow } from "@skills-re/api/modules/skills/repo";

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 10;
const CONTINUATION_DELAY_SECONDS = 1200;

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface AiSearchBackfillWorkflowDeps {
  aiSearchItems: AiSearchItemsRuntime;
  listSkillsForAiSearchBackfill: (input: {
    batchSize: number;
    lastSeenId?: string;
  }) => Promise<AiSearchBackfillRow[]>;
  snapshotStorage: SnapshotStorageRuntime;
  scheduleContinuation?: AiSearchBackfillWorkflowScheduler | null;
  updateSkillAiSearchItemId: (input: { aiSearchItemId: string; skillId: string }) => Promise<void>;
}

export const runAiSearchBackfillWorkflow = async (
  event: Readonly<WorkflowEvent<AiSearchBackfillWorkflowPayload>>,
  step: WorkflowStep,
  deps: AiSearchBackfillWorkflowDeps,
) => {
  const batchSize = Math.max(
    1,
    Math.min(event.payload.batchSize ?? DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE),
  );
  const { lastSeenId } = event.payload;

  const skills = await step.do(
    `ai-search-backfill-fetch-batch-lastSeenId-${lastSeenId ?? "start"}`,
    workflowStepRetryPolicy.aiSearchBackfillBatch,
    async () =>
      await deps.listSkillsForAiSearchBackfill({
        batchSize,
        lastSeenId,
      }),
  );

  const nextLastSeenId = skills.at(-1)?.skillId ?? null;

  for (const skill of skills) {
    if (!skill.skillMdR2Key) {
      continue;
    }

    await step.do(
      `ai-search-backfill-upload-${skill.skillId}`,
      workflowStepRetryPolicy.aiSearchBackfillBatch,
      async () => {
        const r2Key = skill.skillMdR2Key;
        if (!r2Key) {
          return;
        }
        const obj = await deps.snapshotStorage.getSnapshotFileObject(r2Key);
        if (!obj) {
          return;
        }

        const buffer = await obj.arrayBuffer();
        const content = new TextDecoder().decode(buffer);

        const { id } = await deps.aiSearchItems.uploadItem(`${skill.skillId}.md`, content, {
          authorHandle: skill.authorHandle,
          repoName: skill.repoName,
          skillId: skill.skillId,
          skillSlug: skill.skillSlug,
          version: skill.version ?? "1.0.0",
        });

        await deps.updateSkillAiSearchItemId({
          aiSearchItemId: id,
          skillId: skill.skillId,
        });
      },
    );
  }

  if (nextLastSeenId !== null && deps.scheduleContinuation) {
    await step.do(
      "enqueue-ai-search-backfill-continuation",
      workflowStepRetryPolicy.aiSearchBackfillBatch,
      async () =>
        await deps.scheduleContinuation?.enqueue(
          {
            batchSize,
            lastSeenId: nextLastSeenId,
          },
          {
            delaySeconds: CONTINUATION_DELAY_SECONDS,
          },
        ),
    );
  }

  return { nextLastSeenId, processed: skills.length };
};
