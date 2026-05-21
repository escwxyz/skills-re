import type { RepoStatsSyncScheduler } from "@skills-re/api/types";
import { nanoid } from "nanoid";
import { logHandledError } from "../logging";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";
import { createWorkerLogger } from "../worker-logger";
import type { WorkerLogger } from "../worker-logger";
import { createGithubRepoStatsRuntime } from "../github-stats";
import { reposService } from "@skills-re/api/modules/repos/service";
import { enqueueQueueMessage, getDeterministicQueueDelaySeconds } from "../lib/cloudflare/queues";
import type { QueueBinding } from "../lib/cloudflare/queues";
import type { WorkflowQueueMessage } from "../queues/workflow-queue";

export interface RepoStatsSyncWorkflowPayload {
  cursor?: string;
  limit?: number;
  maxPages?: number;
}

type RepoStatsSyncWorkflowEnv = Env & {
  REPO_STATS_SYNC_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
  REPO_STATS_SYNC_WORKFLOW?: WorkflowCreateBinding<RepoStatsSyncWorkflowPayload>;
};

const REPO_STATS_SYNC_QUEUE_SPREAD_SECONDS = 120;

const createLocalScheduler = (
  env: RepoStatsSyncWorkflowEnv,
  logger?: WorkerLogger,
): RepoStatsSyncScheduler => {
  const githubStats = createGithubRepoStatsRuntime(env, { logger });

  return {
    async enqueue(payload) {
      const workId = `local-${nanoid()}`;
      const log = (logger ?? createWorkerLogger({ component: "repo-stats.local-scheduler" })).child(
        {
          workId,
        },
      );

      let { cursor } = payload;
      let pages = 0;

      const maxPages = Math.max(1, Math.min(payload.maxPages ?? 5, 25));
      while (pages < maxPages) {
        try {
          const result = await reposService.syncStats(
            {
              cursor,
              limit: payload.limit,
            },
            {
              fetchRepoStats: githubStats.fetchRepoStats,
            },
          );

          pages += 1;
          if (!result || result.isDone || !result.continueCursor) {
            return { workId };
          }

          cursor = result.continueCursor;
        } catch (error) {
          logHandledError({
            component: "repo-stats.local-scheduler",
            error,
            event: "repo-stats.local-scheduler.failed",
            fields: {
              workId,
            },
            logger: log,
          });
          return { workId };
        }
      }

      return { workId };
    },
  };
};

export const getRepoStatsSyncWorkflowScheduler = (
  env: RepoStatsSyncWorkflowEnv,
  options: { logger?: WorkerLogger } = {},
): RepoStatsSyncScheduler => {
  const binding = env.REPO_STATS_SYNC_WORKFLOW;
  const queueBinding = env.REPO_STATS_SYNC_WORKFLOW_QUEUE;

  if (queueBinding) {
    return {
      async enqueue(payload) {
        const workflowId = `repo-stats-sync-${nanoid()}`;
        await enqueueQueueMessage({
          binding: queueBinding,
          context: "repo-stats-sync",
          delaySeconds: getDeterministicQueueDelaySeconds({
            seed: payload.cursor ?? "start",
            spreadSeconds: REPO_STATS_SYNC_QUEUE_SPREAD_SECONDS,
          }),
          message: {
            kind: "repo-stats-sync",
            payload,
            workflowId,
          },
        });
        return { workId: workflowId };
      },
    };
  }

  if (binding) {
    return makeWorkflowScheduler("repo-stats-sync", binding);
  }

  return createLocalScheduler(env, options.logger);
};
