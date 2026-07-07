// oxlint-disable complexity
import type { RepoStatsSyncWorkflowPayload } from "../workflows/repo-stats";
import type {
  RepoSkillImportWorkflowPayload,
  RepoSkillSnapshotSyncWorkflowPayload,
  RepoSkillsDiscoveryWorkflowPayload,
} from "../workflows/repo-skills-discovery";
import type { SnapshotArchiveUploadWorkflowPayload } from "../workflows/snapshots-archive-upload";
import type { SnapshotUploadWorkflowPayload } from "../workflows/snapshot-upload";
import type { AiSearchBackfillWorkflowPayload } from "../workflows/ai-search-backfill";
import type { WorkerLogger } from "../worker-logger";
import { createWorkflowQueueLogger } from "../logging";
import { CLOUDFLARE_QUEUE_MAX_DELAY_SECONDS } from "../lib/cloudflare/queues";
import { logWorkflowFailure } from "../workflows/workflow-failure-log";
import { enqueueScheduledRepoSkillsDiscovery } from "../crons";
import type { RepoSkillsDiscoverySweepPayload } from "../crons";
import {
  getRepoSkillsDiscoverySweepScheduler,
  getRepoSkillsDiscoveryWorkflowScheduler,
} from "../workflows/repo-skills-discovery-scheduler";

export interface EvaluationWorkflowPayload {
  archiveR2Key?: string | null;
  evaluationId: string;
  entryPath: string;
  repoName: string;
  repoOwnerHandle: string;
  snapshotDirectoryPath: string;
  snapshotId: string;
  snapshotVersion: string;
}

export interface RepoSnapshotSyncWorkflowPayload {
  expectedUpdatedAt?: number;
  repoName: string;
  repoOwner: string;
}

export interface SkillsCategorizationWorkflowPayload {
  skillIds: string[];
}

export interface SkillsTaggingWorkflowPayload {
  skillIds: string[];
  triggerCategorizationAfterTagging?: boolean;
}

export interface SkillsUploadWorkflowPayload {
  stagingKey: string;
}

interface WorkflowCreateBinding<TPayload> {
  create: (input: { id: string; params: TPayload }) => Promise<{ id: string }>;
}

export type WorkflowQueueMessage =
  | {
      kind: "ai-search-backfill";
      notBeforeMs?: number;
      payload: AiSearchBackfillWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "evaluation";
      notBeforeMs?: number;
      payload: EvaluationWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "repo-skill-import";
      notBeforeMs?: number;
      payload: RepoSkillImportWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "repo-skills-discovery";
      notBeforeMs?: number;
      payload: RepoSkillsDiscoveryWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "repo-skills-discovery-sweep";
      notBeforeMs?: number;
      payload: RepoSkillsDiscoverySweepPayload;
      workflowId: string;
    }
  | {
      kind: "repo-skill-snapshot-sync";
      notBeforeMs?: number;
      payload: RepoSkillSnapshotSyncWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "repo-snapshot-sync";
      notBeforeMs?: number;
      payload: RepoSnapshotSyncWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "repo-stats-sync";
      notBeforeMs?: number;
      payload: RepoStatsSyncWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "snapshot-archive-upload";
      notBeforeMs?: number;
      payload: SnapshotArchiveUploadWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "snapshot-upload";
      notBeforeMs?: number;
      payload: SnapshotUploadWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "skills-categorization";
      notBeforeMs?: number;
      payload: SkillsCategorizationWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "skills-tagging";
      notBeforeMs?: number;
      payload: SkillsTaggingWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "skills-upload";
      notBeforeMs?: number;
      payload: SkillsUploadWorkflowPayload;
      workflowId: string;
    };

export type WorkflowQueueEnv = Env & {
  AI_SEARCH_BACKFILL_WORKFLOW?: WorkflowCreateBinding<AiSearchBackfillWorkflowPayload>;
  EVALUATION_WORKFLOW?: WorkflowCreateBinding<EvaluationWorkflowPayload>;
  REPO_SKILL_IMPORT_WORKFLOW?: WorkflowCreateBinding<RepoSkillImportWorkflowPayload>;
  REPO_SKILLS_DISCOVERY_WORKFLOW?: WorkflowCreateBinding<RepoSkillsDiscoveryWorkflowPayload>;
  REPO_SKILL_SNAPSHOT_SYNC_WORKFLOW?: WorkflowCreateBinding<RepoSkillSnapshotSyncWorkflowPayload>;
  REPO_SNAPSHOT_SYNC_WORKFLOW?: WorkflowCreateBinding<RepoSnapshotSyncWorkflowPayload>;
  REPO_STATS_SYNC_WORKFLOW?: WorkflowCreateBinding<RepoStatsSyncWorkflowPayload>;
  SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW?: WorkflowCreateBinding<SnapshotArchiveUploadWorkflowPayload>;
  SNAPSHOT_UPLOAD_WORKFLOW?: WorkflowCreateBinding<SnapshotUploadWorkflowPayload>;
  SKILLS_CATEGORIZATION_WORKFLOW?: WorkflowCreateBinding<SkillsCategorizationWorkflowPayload>;
  SKILLS_TAGGING_WORKFLOW?: WorkflowCreateBinding<SkillsTaggingWorkflowPayload>;
  SKILLS_UPLOAD_WORKFLOW?: WorkflowCreateBinding<SkillsUploadWorkflowPayload>;
};

const DUPLICATE_WORKFLOW_ERROR_PATTERN = /already exists|duplicate|conflict/i;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const summarizeInvalidQueueBody = (value: unknown) => {
  if (value === null) {
    return {
      bodyType: "null" as const,
    };
  }

  const bodyType = typeof value;
  if (bodyType !== "object") {
    return {
      bodyType,
    };
  }

  if (Array.isArray(value)) {
    return {
      bodyLength: value.length,
      bodyType: "array" as const,
    };
  }

  try {
    const objectValue = value as Record<string, unknown>;
    return {
      bodyKeys: Object.keys(objectValue).slice(0, 10),
      bodyType: "object" as const,
    };
  } catch {
    return {
      bodyType: "object" as const,
    };
  }
};

const isWorkflowQueueMessage = (value: unknown): value is WorkflowQueueMessage => {
  if (!isObjectRecord(value)) {
    return false;
  }
  if (typeof value.kind !== "string" || typeof value.workflowId !== "string") {
    return false;
  }
  if (!isObjectRecord(value.payload)) {
    return false;
  }
  if (value.kind === "snapshot-upload" || value.kind === "skills-upload") {
    return typeof (value.payload as Record<string, unknown>).stagingKey === "string";
  }
  if (value.kind === "ai-search-backfill") {
    const payload = value.payload as Record<string, unknown>;
    return (
      (payload.batchSize === undefined || typeof payload.batchSize === "number") &&
      (payload.lastSeenId === undefined || typeof payload.lastSeenId === "string")
    );
  }
  if (value.kind === "repo-skill-import") {
    const payload = value.payload as Record<string, unknown>;
    return (
      typeof payload.repoName === "string" &&
      typeof payload.repoOwner === "string" &&
      typeof payload.skillRootPath === "string"
    );
  }
  if (value.kind === "repo-skills-discovery") {
    const payload = value.payload as Record<string, unknown>;
    return typeof payload.repoName === "string" && typeof payload.repoOwner === "string";
  }
  if (value.kind === "repo-skills-discovery-sweep") {
    const payload = value.payload as Record<string, unknown>;
    return (
      (payload.cursor === undefined || typeof payload.cursor === "string") &&
      (payload.limit === undefined || typeof payload.limit === "number") &&
      (payload.maxPages === undefined || typeof payload.maxPages === "number")
    );
  }
  if (value.kind === "repo-skill-snapshot-sync") {
    const payload = value.payload as Record<string, unknown>;
    return (
      typeof payload.expectedHeadSha === "string" &&
      typeof payload.repoName === "string" &&
      typeof payload.repoOwner === "string" &&
      typeof payload.skillId === "string" &&
      typeof payload.skillRootPath === "string"
    );
  }
  return (
    value.kind === "evaluation" ||
    value.kind === "repo-snapshot-sync" ||
    value.kind === "repo-stats-sync" ||
    value.kind === "snapshot-archive-upload" ||
    value.kind === "skills-categorization" ||
    value.kind === "skills-tagging"
  );
};

const isWorkflowAlreadyCreatedError = (error: unknown) =>
  error instanceof Error && DUPLICATE_WORKFLOW_ERROR_PATTERN.test(error.message);

const assertUnreachable = (value: never): never => {
  throw new Error(`Unhandled workflow kind: ${String(value)}`);
};

const getWorkflowNameForQueueKind = (kind: WorkflowQueueMessage["kind"]) => {
  switch (kind) {
    case "ai-search-backfill": {
      return "skills-re-v1-ai-search-backfill";
    }
    case "evaluation": {
      return "skills-re-v1-evaluation";
    }
    case "repo-snapshot-sync": {
      return "skills-re-v1-repo-snapshot-sync";
    }
    case "repo-skill-import": {
      return "skills-re-v1-repo-skill-import";
    }
    case "repo-skills-discovery": {
      return "skills-re-v1-repo-skills-discovery";
    }
    case "repo-skills-discovery-sweep": {
      return "skills-re-v1-repo-skills-discovery-sweep";
    }
    case "repo-skill-snapshot-sync": {
      return "skills-re-v1-repo-skill-snapshot-sync";
    }
    case "repo-stats-sync": {
      return "skills-re-v1-repo-stats-sync";
    }
    case "snapshot-archive-upload": {
      return "skills-re-v1-snapshots-archive-upload";
    }
    case "snapshot-upload": {
      return "skills-re-v1-snapshot-upload";
    }
    case "skills-categorization": {
      return "skills-re-v1-skills-categorization";
    }
    case "skills-tagging": {
      return "skills-re-v1-skills-tagging";
    }
    case "skills-upload": {
      return "skills-re-v1-skills-upload";
    }
    default: {
      return assertUnreachable(kind);
    }
  }
};

const getWorkflowBinding = <TPayload>(env: WorkflowQueueEnv, key: keyof WorkflowQueueEnv) => {
  const binding = env[key];
  if (!binding) {
    throw new Error(`Workflow binding \`${String(key)}\` is missing in wrangler config.`);
  }

  return binding as WorkflowCreateBinding<TPayload>;
};

const startWorkflowFromQueueMessage = async (
  message: WorkflowQueueMessage,
  env: WorkflowQueueEnv,
) => {
  switch (message.kind) {
    case "ai-search-backfill": {
      await getWorkflowBinding<AiSearchBackfillWorkflowPayload>(
        env,
        "AI_SEARCH_BACKFILL_WORKFLOW",
      ).create({
        id: message.workflowId,
        params: message.payload,
      });
      return;
    }
    case "evaluation": {
      await getWorkflowBinding<EvaluationWorkflowPayload>(env, "EVALUATION_WORKFLOW").create({
        id: message.workflowId,
        params: message.payload,
      });
      return;
    }
    case "repo-snapshot-sync": {
      await getWorkflowBinding<RepoSnapshotSyncWorkflowPayload>(
        env,
        "REPO_SNAPSHOT_SYNC_WORKFLOW",
      ).create({
        id: message.workflowId,
        params: message.payload,
      });
      return;
    }
    case "repo-skill-import": {
      await getWorkflowBinding<RepoSkillImportWorkflowPayload>(
        env,
        "REPO_SKILL_IMPORT_WORKFLOW",
      ).create({
        id: message.workflowId,
        params: message.payload,
      });
      return;
    }
    case "repo-skills-discovery": {
      await getWorkflowBinding<RepoSkillsDiscoveryWorkflowPayload>(
        env,
        "REPO_SKILLS_DISCOVERY_WORKFLOW",
      ).create({
        id: message.workflowId,
        params: message.payload,
      });
      return;
    }
    case "repo-skills-discovery-sweep": {
      await enqueueScheduledRepoSkillsDiscovery(
        env,
        {
          getRepoSkillsDiscoverySweepScheduler,
          getRepoSkillsDiscoveryWorkflowScheduler,
        },
        message.payload,
      );
      return;
    }
    case "repo-skill-snapshot-sync": {
      await getWorkflowBinding<RepoSkillSnapshotSyncWorkflowPayload>(
        env,
        "REPO_SKILL_SNAPSHOT_SYNC_WORKFLOW",
      ).create({
        id: message.workflowId,
        params: message.payload,
      });
      return;
    }
    case "repo-stats-sync": {
      await getWorkflowBinding<RepoStatsSyncWorkflowPayload>(
        env,
        "REPO_STATS_SYNC_WORKFLOW",
      ).create({
        id: message.workflowId,
        params: message.payload,
      });
      return;
    }
    case "snapshot-archive-upload": {
      await getWorkflowBinding<SnapshotArchiveUploadWorkflowPayload>(
        env,
        "SNAPSHOTS_ARCHIVE_UPLOAD_WORKFLOW",
      ).create({
        id: message.workflowId,
        params: message.payload,
      });
      return;
    }
    case "snapshot-upload": {
      await getWorkflowBinding<SnapshotUploadWorkflowPayload>(
        env,
        "SNAPSHOT_UPLOAD_WORKFLOW",
      ).create({
        id: message.workflowId,
        params: message.payload,
      });
      return;
    }
    case "skills-categorization": {
      await getWorkflowBinding<SkillsCategorizationWorkflowPayload>(
        env,
        "SKILLS_CATEGORIZATION_WORKFLOW",
      ).create({
        id: message.workflowId,
        params: message.payload,
      });
      return;
    }
    case "skills-tagging": {
      await getWorkflowBinding<SkillsTaggingWorkflowPayload>(env, "SKILLS_TAGGING_WORKFLOW").create(
        {
          id: message.workflowId,
          params: message.payload,
        },
      );
      return;
    }
    case "skills-upload": {
      await getWorkflowBinding<SkillsUploadWorkflowPayload>(env, "SKILLS_UPLOAD_WORKFLOW").create({
        id: message.workflowId,
        params: message.payload,
      });
      return;
    }

    default: {
      throw new Error("Unsupported workflow kind");
    }
  }
};

export const processWorkflowQueueBatch = async (
  batch: MessageBatch<unknown>,
  env: WorkflowQueueEnv,
  logger?: WorkerLogger,
) => {
  const log = logger ?? createWorkflowQueueLogger();

  for (const message of batch.messages) {
    if (!isWorkflowQueueMessage(message.body)) {
      log.error("workflow.queue.invalid-message", {
        ...summarizeInvalidQueueBody(message.body),
      });
      message.ack();
      continue;
    }

    const { notBeforeMs } = message.body;
    if (typeof notBeforeMs === "number" && Date.now() < notBeforeMs) {
      message.retry({
        delaySeconds: Math.min(
          CLOUDFLARE_QUEUE_MAX_DELAY_SECONDS,
          Math.max(1, Math.ceil((notBeforeMs - Date.now()) / 1000)),
        ),
      });
      continue;
    }

    try {
      await startWorkflowFromQueueMessage(message.body, env);
      message.ack();
    } catch (error) {
      if (isWorkflowAlreadyCreatedError(error)) {
        log.warn("workflow.queue.duplicate-workflow", {
          kind: message.body.kind,
          workflowId: message.body.workflowId,
        });
        message.ack();
        continue;
      }

      logWorkflowFailure({
        component: "workflow.queue",
        entrypoint: "WorkflowQueue",
        error,
        fields: {
          kind: message.body.kind,
          workflowId: message.body.workflowId,
        },
        instanceId: message.body.workflowId,
        workflowName: getWorkflowNameForQueueKind(message.body.kind),
      });
      message.retry();
    }
  }
};
