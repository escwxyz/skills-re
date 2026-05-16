import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import { reposService } from "@skills-re/api/modules/repos/service";

import type { RepoStatsSyncWorkflowPayload } from "./repo-stats";

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface RepoStatsSyncWorkflowDeps {
  syncStats: typeof reposService.syncStats;
}

const DEFAULT_LIMIT = 20;
const MAX_PAGES_PER_RUN = 25;

const defaultDeps: RepoStatsSyncWorkflowDeps = {
  syncStats: reposService.syncStats,
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
  const limit = Math.max(1, Math.min(event.payload.limit ?? DEFAULT_LIMIT, 20));
  let { cursor } = event.payload;
  let processedPages = 0;
  const changed: {
    repoOwner: string;
    repoName: string;
    updatedAt: number;
  }[] = [];

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

    if (result.isDone || !result.continueCursor) {
      return {
        changedCount: changed.length,
        continueCursor: "",
        processedPages,
        status: "completed",
      } as const;
    }

    cursor = result.continueCursor;
  }

  return {
    changedCount: changed.length,
    continueCursor: cursor ?? "",
    processedPages,
    status: "partial",
  } as const;
};
