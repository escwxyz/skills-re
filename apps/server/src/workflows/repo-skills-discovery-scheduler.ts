import { nanoid } from "nanoid";

import { enqueueQueueMessage, getDeterministicQueueDelaySeconds } from "../lib/cloudflare/queues";
import type { QueueBinding } from "../lib/cloudflare/queues";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding, WorkflowScheduler } from "./lib/scheduler";
import type { WorkflowQueueMessage } from "../queues/workflow-queue";
import { reserveWorkflowRateLimitSlot } from "@/lib/workflows/rate-limit-reservation";
import type { WorkflowRateLimiterNamespace } from "@/lib/workflows/rate-limit-reservation";
import type {
  RepoSkillImportWorkflowPayload,
  RepoSkillSnapshotSyncWorkflowPayload,
  RepoSkillsDiscoveryWorkflowPayload,
} from "./repo-skills-discovery";
import type { RepoSkillsDiscoverySweepPayload } from "../crons";

interface RepoSkillsDiscoveryWorkflowEnv {
  AI_WORKFLOW_RATE_LIMITER?: unknown;
  REPO_SKILLS_DISCOVERY_WORKFLOW_DAILY_LIMIT?: string;
  REPO_SKILLS_DISCOVERY_WORKFLOW_SPACING_SECONDS?: string;
  REPO_SKILLS_DISCOVERY_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
  REPO_SKILLS_DISCOVERY_WORKFLOW?: WorkflowCreateBinding<RepoSkillsDiscoveryWorkflowPayload>;
}

interface RepoSkillImportQueueEnv {
  REPO_SKILL_IMPORT_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
}

interface RepoSkillSnapshotSyncQueueEnv {
  REPO_SKILL_SNAPSHOT_SYNC_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
}

const DEFAULT_REPO_SKILLS_DISCOVERY_WORKFLOW_DAILY_LIMIT = 5000;
const DEFAULT_REPO_SKILLS_DISCOVERY_WORKFLOW_SPACING_SECONDS = 1;

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getRepoSkillsDiscoveryWorkflowScheduler = (
  env: RepoSkillsDiscoveryWorkflowEnv,
): WorkflowScheduler<RepoSkillsDiscoveryWorkflowPayload> | null => {
  const binding = env.REPO_SKILLS_DISCOVERY_WORKFLOW;
  const queueBinding = env.REPO_SKILLS_DISCOVERY_WORKFLOW_QUEUE;
  if (queueBinding) {
    return {
      async enqueue(payload) {
        const workflowId = `repo-skills-discovery-${nanoid()}`;
        const reservation = await reserveWorkflowRateLimitSlot({
          dailyLimit: parsePositiveInteger(
            env.REPO_SKILLS_DISCOVERY_WORKFLOW_DAILY_LIMIT,
            DEFAULT_REPO_SKILLS_DISCOVERY_WORKFLOW_DAILY_LIMIT,
          ),
          namespace: env.AI_WORKFLOW_RATE_LIMITER as WorkflowRateLimiterNamespace | undefined,
          scope: "repo-skills-discovery",
          spacingMs:
            parsePositiveInteger(
              env.REPO_SKILLS_DISCOVERY_WORKFLOW_SPACING_SECONDS,
              DEFAULT_REPO_SKILLS_DISCOVERY_WORKFLOW_SPACING_SECONDS,
            ) * 1000,
        });
        const deterministicDelaySeconds = getDeterministicQueueDelaySeconds({
          seed: `${payload.repoOwner}/${payload.repoName}`,
          spreadSeconds: 300,
        });
        await enqueueQueueMessage({
          binding: queueBinding,
          context: "repo-skills-discovery",
          delaySeconds: Math.max(reservation.delaySeconds, deterministicDelaySeconds),
          message: {
            kind: "repo-skills-discovery",
            notBeforeMs: reservation.notBeforeMs,
            payload,
            workflowId,
          },
        });
        return { workId: workflowId };
      },
    };
  }
  return binding ? makeWorkflowScheduler("repo-skills-discovery", binding) : null;
};

export const getRepoSkillsDiscoverySweepScheduler = (
  env: RepoSkillsDiscoveryWorkflowEnv,
): WorkflowScheduler<RepoSkillsDiscoverySweepPayload> | null => {
  const queueBinding = env.REPO_SKILLS_DISCOVERY_WORKFLOW_QUEUE;
  if (!queueBinding) {
    return null;
  }

  return {
    async enqueue(payload) {
      const workflowId = `repo-skills-discovery-sweep-${nanoid()}`;
      await enqueueQueueMessage({
        binding: queueBinding,
        context: "repo-skills-discovery-sweep",
        message: {
          kind: "repo-skills-discovery-sweep",
          payload,
          workflowId,
        },
      });
      return { workId: workflowId };
    },
  };
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
