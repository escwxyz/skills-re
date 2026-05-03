type WorkflowDurationLabel = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

type WorkflowDuration = `${number} ${WorkflowDurationLabel}${"s" | ""}` | number;

interface WorkflowStepConfig {
  retries?: {
    limit: number;
    delay: WorkflowDuration;
    backoff?: "constant" | "linear" | "exponential";
  };
  timeout?: WorkflowDuration;
}

const buildStepConfig = (input: {
  limit: number;
  delay: WorkflowDuration;
  timeout: WorkflowDuration;
}): WorkflowStepConfig => ({
  retries: {
    backoff: "exponential",
    delay: input.delay,
    limit: input.limit,
  },
  timeout: input.timeout,
});

export const workflowStepRetryPolicy = {
  repoSnapshotEnqueue: buildStepConfig({
    delay: "10 seconds",
    limit: 3,
    timeout: "90 seconds",
  }),
  repoSnapshotSync: buildStepConfig({
    delay: "20 seconds",
    limit: 3,
    timeout: "5 minutes",
  }),
  repoSyncPage: buildStepConfig({
    delay: "15 seconds",
    limit: 3,
    timeout: "2 minutes",
  }),
  aiSearchBackfillBatch: buildStepConfig({
    delay: "10 seconds",
    limit: 3,
    timeout: "5 minutes",
  }),
  staticAuditBackfillDispatch: buildStepConfig({
    delay: "10 seconds",
    limit: 3,
    timeout: "3 minutes",
  }),
  skillsCategorizationPipeline: buildStepConfig({
    delay: "20 seconds",
    limit: 1,
    timeout: "2 minutes",
  }),
  skillsTaggingPipeline: buildStepConfig({
    delay: "20 seconds",
    limit: 1,
    timeout: "2 minutes",
  }),
  skillsUploadPipeline: buildStepConfig({
    delay: "20 seconds",
    limit: 3,
    timeout: "10 minutes",
  }),
  snapshotArchiveUpload: buildStepConfig({
    delay: "10 seconds",
    limit: 3,
    timeout: "3 minutes",
  }),
  snapshotUpload: buildStepConfig({
    delay: "10 seconds",
    limit: 3,
    timeout: "3 minutes",
  }),
} as const satisfies Record<string, WorkflowStepConfig>;
