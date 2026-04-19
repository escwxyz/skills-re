import type { RepoStatsSyncScheduler } from "@skills-re/api/types";
import { reposService } from "@skills-re/api/modules/repos/service";
import { nanoid } from "nanoid";

interface WorkflowCreateBinding<TPayload> {
  create: (options?: { id?: string; params?: TPayload }) => Promise<{ id: string }>;
}

export interface RepoStatsSyncWorkflowPayload {
  cursor?: string;
  limit?: number;
}

type RepoStatsSyncWorkflowEnv = Env & {
  REPO_STATS_SYNC_WORKFLOW?: WorkflowCreateBinding<RepoStatsSyncWorkflowPayload>;
};

const createWorkflowInstanceId = () => `repo-stats-sync-${nanoid()}`;

export const createRepoStatsSyncWorkflowScheduler = (
  binding: WorkflowCreateBinding<RepoStatsSyncWorkflowPayload>,
): RepoStatsSyncScheduler => ({
  async enqueue(payload) {
    const instance = await binding.create({
      id: createWorkflowInstanceId(),
      params: payload,
    });

    return { workId: instance.id };
  },
});

const createLocalScheduler = (): RepoStatsSyncScheduler => ({
  enqueue(payload) {
    const workId = `local-${nanoid()}`;

    void (async () => {
      let { cursor } = payload;
      let pages = 0;

      while (pages < 25) {
        const result = await reposService.syncStats({
          cursor,
          limit: payload.limit,
        });

        pages += 1;
        if (!result || result.isDone || !result.continueCursor) {
          return;
        }

        cursor = result.continueCursor;
      }
    })().catch((error) => {
      console.error("local repo stats sync scheduler failed", {
        message: error instanceof Error ? error.message : "unknown error",
        workId,
      });
    });

    return Promise.resolve({ workId });
  },
});

export const getRepoStatsSyncWorkflowScheduler = (
  env: RepoStatsSyncWorkflowEnv,
): RepoStatsSyncScheduler => {
  const binding = env.REPO_STATS_SYNC_WORKFLOW;

  if (binding) {
    return createRepoStatsSyncWorkflowScheduler(binding);
  }

  return createLocalScheduler();
};
