import type { RepoStatsSyncScheduler } from "@skills-re/api/types";
import { reposService } from "@skills-re/api/modules/repos/service";
import { nanoid } from "nanoid";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";

export interface RepoStatsSyncWorkflowPayload {
  cursor?: string;
  limit?: number;
}

type RepoStatsSyncWorkflowEnv = Env & {
  REPO_STATS_SYNC_WORKFLOW?: WorkflowCreateBinding<RepoStatsSyncWorkflowPayload>;
};

const createLocalScheduler = (): RepoStatsSyncScheduler => ({
  enqueue(payload) {
    const workId = `local-${nanoid()}`;

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
          console.error("local repo stats sync scheduler failed", {
            message: error instanceof Error ? error.message : "unknown error",
            workId,
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
): RepoStatsSyncScheduler => {
  const binding = env.REPO_STATS_SYNC_WORKFLOW;

  if (binding) {
    return makeWorkflowScheduler("repo-stats-sync", binding);
  }

  return createLocalScheduler();
};
