import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import { reposService } from "@skills-re/api/modules/repos/service";
import type { RepoSnapshotSyncScheduler } from "@skills-re/api/types";

import type { RepoStatsSyncWorkflowPayload } from "./repo-stats";

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface RepoStatsSyncWorkflowDeps {
  snapshotSyncScheduler?: RepoSnapshotSyncScheduler | null;
  syncStats: typeof reposService.syncStats;
}

const DEFAULT_LIMIT = 20;
const MAX_PAGES_PER_RUN = 25;

const defaultDeps: RepoStatsSyncWorkflowDeps = {
  snapshotSyncScheduler: null,
  syncStats: reposService.syncStats,
};

const enqueueRepoSnapshotSyncBatch = async (
  snapshotWorkflowScheduler: RepoSnapshotSyncScheduler,
  changedRepos: {
    repoOwner: string;
    repoName: string;
    updatedAt: number;
  }[],
) => {
  const settled = await Promise.allSettled(
    changedRepos.map((repo) =>
      snapshotWorkflowScheduler.enqueue({
        expectedUpdatedAt: repo.updatedAt,
        repoName: repo.repoName,
        repoOwner: repo.repoOwner,
      }),
    ),
  );

  const failed = settled
    .map((item, index) => ({
      item,
      repo: changedRepos[index],
    }))
    .filter(
      (
        entry,
      ): entry is {
        item: PromiseRejectedResult;
        repo: {
          repoOwner: string;
          repoName: string;
          updatedAt: number;
        };
      } => entry.item.status === "rejected",
    );

  if (failed.length > 0) {
    throw new Error(
      [
        "Failed to enqueue one or more repo snapshot sync jobs.",
        ...failed.map(({ item, repo }) => {
          const reason = String(item.reason);
          return `- ${repo.repoOwner}/${repo.repoName}: ${reason}`;
        }),
      ].join("\n"),
    );
  }

  return settled.filter((item) => item.status === "fulfilled").length;
};

const syncRepoStatsPage = (
  syncStats: typeof reposService.syncStats,
  cursor: string | undefined,
  limit: number,
) =>
  syncStats({
    cursor,
    limit,
  });

export const runRepoStatsSyncWorkflow = async (
  event: Readonly<WorkflowEvent<RepoStatsSyncWorkflowPayload>>,
  step: WorkflowStep,
  deps: Partial<RepoStatsSyncWorkflowDeps> = {},
) => {
  const activeDeps = {
    ...defaultDeps,
    ...deps,
  };
  const snapshotWorkflowScheduler = activeDeps.snapshotSyncScheduler;
  if (!snapshotWorkflowScheduler) {
    throw new Error("Repo snapshot sync scheduler is unavailable.");
  }
  const limit = Math.max(1, Math.min(event.payload.limit ?? DEFAULT_LIMIT, 20));
  let { cursor } = event.payload;
  let processedPages = 0;
  const changed: {
    repoOwner: string;
    repoName: string;
    updatedAt: number;
  }[] = [];
  let scheduledSnapshotSyncCount = 0;

  while (processedPages < MAX_PAGES_PER_RUN) {
    const currentCursor = cursor;
    const result = await step.do(
      `sync-repo-stats-page-${processedPages + 1}`,
      workflowStepRetryPolicy.repoSyncPage,
      () => syncRepoStatsPage(activeDeps.syncStats, currentCursor, limit),
    );

    processedPages += 1;
    if (!result) {
      return {
        changedCount: changed.length,
        continueCursor: "",
        processedPages,
        status: "completed",
      } as const;
    }

    changed.push(...result.changed);
    if (result.changed.length > 0) {
      const scheduled = await step.do(
        `enqueue-repo-snapshot-sync-${processedPages}`,
        workflowStepRetryPolicy.repoSnapshotEnqueue,
        () => enqueueRepoSnapshotSyncBatch(snapshotWorkflowScheduler, result.changed),
      );
      scheduledSnapshotSyncCount += scheduled;
    }

    if (result.isDone || !result.continueCursor) {
      return {
        changedCount: changed.length,
        continueCursor: "",
        processedPages,
        scheduledSnapshotSyncCount,
        status: "completed",
      } as const;
    }

    cursor = result.continueCursor;
  }

  return {
    changedCount: changed.length,
    continueCursor: cursor ?? "",
    processedPages,
    scheduledSnapshotSyncCount,
    status: "partial",
  } as const;
};
