import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import type { AiSearchItemsRuntime, SnapshotStorageRuntime } from "@skills-re/api/types";
import type { AiSearchBackfillWorkflowPayload } from "./ai-search-backfill";
import type { AiSearchBackfillRow } from "@skills-re/api/modules/skills/repo";

const DEFAULT_BATCH_SIZE = 50;

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
  updateSkillAiSearchItemId: (input: { aiSearchItemId: string; skillId: string }) => Promise<void>;
}

export const runAiSearchBackfillWorkflow = async (
  event: Readonly<WorkflowEvent<AiSearchBackfillWorkflowPayload>>,
  step: WorkflowStep,
  deps: AiSearchBackfillWorkflowDeps,
) => {
  const batchSize = event.payload.batchSize ?? DEFAULT_BATCH_SIZE;
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
          version: skill.version ?? "0.0.1",
        });

        await deps.updateSkillAiSearchItemId({
          aiSearchItemId: id,
          skillId: skill.skillId,
        });
      },
    );
  }

  return { nextLastSeenId, processed: skills.length };
};
