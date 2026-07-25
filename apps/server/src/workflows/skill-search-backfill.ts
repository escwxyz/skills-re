export interface SkillSearchBackfillWorkflowPayload {
  batchSize?: number;
  cursor?: string;
  mode?: "backfill" | "repair";
}

export interface SkillSearchBackfillWorkflowEnqueueOptions {
  delaySeconds?: number;
}

export interface SkillSearchBackfillWorkflowScheduler {
  enqueue(
    payload: SkillSearchBackfillWorkflowPayload,
    options?: SkillSearchBackfillWorkflowEnqueueOptions,
  ): Promise<{ workId: string }>;
}
