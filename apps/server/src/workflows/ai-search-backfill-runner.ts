import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import type { AiSearchItemsRuntime, SnapshotStorageRuntime } from "@skills-re/api/types";
import type { AiSearchBackfillWorkflowPayload } from "./ai-search-backfill";

const DEFAULT_BATCH_SIZE = 50;

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface AiSearchBackfillWorkflowDeps {
  aiSearchItems: AiSearchItemsRuntime;
  listSkillsForAiSearchBackfill: (input: { batchSize: number; offset: number }) => Promise<
    {
      aiSearchItemId: string | null;
      authorHandle: string;
      repoName: string;
      skillId: string;
      skillMdR2Key: string | null;
      skillSlug: string;
      snapshotId: string | null;
      version: string | null;
    }[]
  >;
  snapshotStorage: SnapshotStorageRuntime;
  updateSkillAiSearchItemId: (input: { aiSearchItemId: string; skillId: string }) => Promise<void>;
}

export const runAiSearchBackfillWorkflow = async (
  event: Readonly<WorkflowEvent<AiSearchBackfillWorkflowPayload>>,
  step: WorkflowStep,
  deps: AiSearchBackfillWorkflowDeps,
) => {
  const batchSize = event.payload.batchSize ?? DEFAULT_BATCH_SIZE;
  const offset = event.payload.offset ?? 0;

  const skills = await step.do(
    `ai-search-backfill-fetch-batch-offset-${offset}`,
    workflowStepRetryPolicy.aiSearchBackfillBatch,
    async () =>
      await deps.listSkillsForAiSearchBackfill({
        batchSize,
        offset,
      }),
  );

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
          version: skill.version ?? "0.0.1",
        });

        await deps.updateSkillAiSearchItemId({
          aiSearchItemId: id,
          skillId: skill.skillId,
        });
      },
    );
  }

  return { processed: skills.length };
};
