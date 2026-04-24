import type { RepoStatsSyncWorkflowPayload } from "../workflows/repo-stats";
import type { SnapshotArchiveUploadWorkflowPayload } from "../workflows/snapshots-archive-upload";
import type { SnapshotUploadWorkflowPayload } from "../workflows/snapshot-upload";
import { createWorkerLogger } from "../worker-logger";
import type { WorkerLogger } from "../worker-logger";

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

export type SkillsUploadWorkflowPayload =
  | {
      stagingKey: string;
    }
  | {
      recentCommits?: {
        committedDate?: string | null;
        message?: string | null;
        sha: string;
        url?: string | null;
      }[];
      repo?: {
        createdAt: number;
        defaultBranch: string;
        forks: number;
        license: string;
        nameWithOwner: string;
        owner: {
          avatarUrl?: string | null;
          handle: string;
          name?: string | null;
        };
        stars: number;
        updatedAt: number;
      };
      skills: {
        description: string;
        directoryPath: string;
        entryPath: string;
        frontmatterHash?: string;
        initialSnapshot: {
          files: {
            content: string;
            path: string;
          }[];
          sourceCommitDate: number;
          sourceCommitMessage?: string;
          sourceCommitSha: string;
          sourceCommitUrl?: string;
          sourceRef: string;
          tree: {
            path: string;
            sha: string;
            size?: number;
            type: "blob" | "tree";
          }[];
        };
        license?: string;
        preferredVersion?: string;
        skillContentHash?: string;
        slug: string;
        sourceLocator: string;
        sourceType: "github" | "upload";
        tags?: string[];
        title: string;
      }[];
    };

interface WorkflowCreateBinding<TPayload> {
  create: (input: { id: string; params: TPayload }) => Promise<{ id: string }>;
}

export type WorkflowQueueMessage =
  | {
      kind: "evaluation";
      payload: EvaluationWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "repo-snapshot-sync";
      payload: RepoSnapshotSyncWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "repo-stats-sync";
      payload: RepoStatsSyncWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "snapshot-archive-upload";
      payload: SnapshotArchiveUploadWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "snapshot-upload";
      payload: SnapshotUploadWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "skills-categorization";
      payload: SkillsCategorizationWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "skills-tagging";
      payload: SkillsTaggingWorkflowPayload;
      workflowId: string;
    }
  | {
      kind: "skills-upload";
      payload: SkillsUploadWorkflowPayload;
      workflowId: string;
    };

export type WorkflowQueueEnv = Env & {
  EVALUATION_WORKFLOW?: WorkflowCreateBinding<EvaluationWorkflowPayload>;
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

const isWorkflowQueueMessage = (value: unknown): value is WorkflowQueueMessage => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.kind === "string" &&
    typeof value.workflowId === "string" &&
    isObjectRecord(value.payload) &&
    (value.kind === "evaluation" ||
      value.kind === "repo-snapshot-sync" ||
      value.kind === "repo-stats-sync" ||
      value.kind === "snapshot-archive-upload" ||
      value.kind === "snapshot-upload" ||
      value.kind === "skills-categorization" ||
      value.kind === "skills-tagging" ||
      value.kind === "skills-upload")
  );
};

const isWorkflowAlreadyCreatedError = (error: unknown) =>
  error instanceof Error && DUPLICATE_WORKFLOW_ERROR_PATTERN.test(error.message);

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
  const log = logger ?? createWorkerLogger({ component: "workflow.queue" });

  for (const message of batch.messages) {
    if (!isWorkflowQueueMessage(message.body)) {
      log.error("workflow.queue.invalid-message", {
        body: JSON.stringify(message.body),
      });
      message.ack();
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

      log.error("workflow.queue.start-failed", {
        error: error instanceof Error ? error : new Error(String(error)),
        kind: message.body.kind,
        workflowId: message.body.workflowId,
      });
      message.retry();
    }
  }
};
