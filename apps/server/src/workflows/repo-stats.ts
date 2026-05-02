import type { RepoStatsSyncScheduler } from "@skills-re/api/types";
import { reposService } from "@skills-re/api/modules/repos/service";
import { nanoid } from "nanoid";
import { logHandledError } from "../logging";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";
import { createWorkerLogger } from "../worker-logger";
import type { WorkerLogger } from "../worker-logger";

export interface RepoStatsSyncWorkflowPayload {
  cursor?: string;
  limit?: number;
}

type RepoStatsSyncWorkflowEnv = Env & {
  REPO_STATS_SYNC_WORKFLOW?: WorkflowCreateBinding<RepoStatsSyncWorkflowPayload>;
};

const createLocalScheduler = (logger?: WorkerLogger): RepoStatsSyncScheduler => ({
  async enqueue(payload) {
    const workId = `local-${nanoid()}`;
    const log = (logger ?? createWorkerLogger({ component: "repo-stats.local-scheduler" })).child({
      workId,
    });

    let { cursor } = payload;
    let pages = 0;

    while (pages < 25) {
      try {
        const result = await reposService.syncStats({
          cursor,
          limit: payload.limit,
        });

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
});

export const getRepoStatsSyncWorkflowScheduler = (
  env: RepoStatsSyncWorkflowEnv,
  options: { logger?: WorkerLogger } = {},
): RepoStatsSyncScheduler => {
  const binding = env.REPO_STATS_SYNC_WORKFLOW;

  if (binding) {
    return makeWorkflowScheduler("repo-stats-sync", binding);
  }

  return createLocalScheduler(options.logger);
};
