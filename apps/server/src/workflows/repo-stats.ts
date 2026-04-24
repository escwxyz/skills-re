import type { RepoStatsSyncScheduler } from "@skills-re/api/types";
import { reposService } from "@skills-re/api/modules/repos/service";
import { nanoid } from "nanoid";
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
  enqueue(payload) {
    const workId = `local-${nanoid()}`;
    const log = (logger ?? createWorkerLogger({ component: "repo-stats.local-scheduler" })).child({
      workId,
    });

    void (async () => {
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
            return;
          }

          cursor = result.continueCursor;
        } catch (error) {
          log.error("repo-stats.local-scheduler.failed", {
            error: error instanceof Error ? error : new Error(String(error)),
          });
          return;
        }
      }
    })();

    return Promise.resolve({ workId });
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
