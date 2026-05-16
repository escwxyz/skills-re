import { nanoid } from "nanoid";

import { enqueueQueueMessage } from "../lib/cloudflare/queues";
import type { QueueBinding } from "../lib/cloudflare/queues";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding, WorkflowScheduler } from "./lib/scheduler";
import type { WorkflowQueueMessage } from "../queues/workflow-queue";
import type {
  RepoSkillImportWorkflowPayload,
  RepoSkillSnapshotSyncWorkflowPayload,
  RepoSkillsDiscoveryWorkflowPayload,
} from "./repo-skills-discovery";

type RepoSkillsDiscoveryWorkflowEnv = Env & {
  REPO_SKILLS_DISCOVERY_WORKFLOW?: WorkflowCreateBinding<RepoSkillsDiscoveryWorkflowPayload>;
};

type RepoSkillImportQueueEnv = Env & {
  REPO_SKILL_IMPORT_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
};

type RepoSkillSnapshotSyncQueueEnv = Env & {
  REPO_SKILL_SNAPSHOT_SYNC_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
};

export const getRepoSkillsDiscoveryWorkflowScheduler = (
  env: RepoSkillsDiscoveryWorkflowEnv,
): WorkflowScheduler<RepoSkillsDiscoveryWorkflowPayload> | null => {
  const binding = env.REPO_SKILLS_DISCOVERY_WORKFLOW;
  return binding ? makeWorkflowScheduler("repo-skills-discovery", binding) : null;
};

export const getRepoSkillImportWorkflowQueueScheduler = (
  env: RepoSkillImportQueueEnv,
): WorkflowScheduler<RepoSkillImportWorkflowPayload> | null => {
  const binding = env.REPO_SKILL_IMPORT_WORKFLOW_QUEUE;
  if (!binding) {
    return null;
  }

  return {
    async enqueue(payload) {
      const workflowId = `repo-skill-import-${nanoid()}`;
      await enqueueQueueMessage({
        binding,
        context: "repo-skill-import",
        message: {
          kind: "repo-skill-import",
          payload,
          workflowId,
        },
      });
      return { workId: workflowId };
    },
  };
};

export const getRepoSkillSnapshotSyncWorkflowQueueScheduler = (
  env: RepoSkillSnapshotSyncQueueEnv,
): WorkflowScheduler<RepoSkillSnapshotSyncWorkflowPayload> | null => {
  const binding = env.REPO_SKILL_SNAPSHOT_SYNC_WORKFLOW_QUEUE;
  if (!binding) {
    return null;
  }

  return {
    async enqueue(payload) {
      const workflowId = `repo-skill-snapshot-sync-${nanoid()}`;
      await enqueueQueueMessage({
        binding,
        context: "repo-skill-snapshot-sync",
        message: {
          kind: "repo-skill-snapshot-sync",
          payload,
          workflowId,
        },
      });
      return { workId: workflowId };
    },
  };
};
