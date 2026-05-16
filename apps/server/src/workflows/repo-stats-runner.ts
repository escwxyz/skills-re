import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import { reposService } from "@skills-re/api/modules/repos/service";

import type { RepoStatsSyncWorkflowPayload } from "./repo-stats";

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

interface WorkflowScheduler<TPayload> {
  enqueue(input: TPayload): Promise<{ workId: string }>;
}

export interface RepoStatsSyncWorkflowDeps {
  syncStats: typeof reposService.syncStats;
  skillsDiscoveryScheduler?: WorkflowScheduler<{
    expectedUpdatedAt?: number;
    repoName: string;
    repoOwner: string;
  }> | null;
}

const DEFAULT_LIMIT = 20;
const MAX_PAGES_PER_RUN = 25;

const defaultDeps: RepoStatsSyncWorkflowDeps = {
  skillsDiscoveryScheduler: null,
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

const scheduleDiscoveryJobs = async (
  scheduler:
    | WorkflowScheduler<{
        expectedUpdatedAt?: number;
        repoName: string;
        repoOwner: string;
      }>
    | null
    | undefined,
  repos: { repoOwner: string; repoName: string; updatedAt: number }[],
) => {
  if (!scheduler || repos.length === 0) {
    return 0;
  }
  await Promise.all(
    repos.map((repo) =>
      scheduler.enqueue({
        expectedUpdatedAt: repo.updatedAt,
        repoName: repo.repoName,
        repoOwner: repo.repoOwner,
      }),
    ),
  );
  return repos.length;
};

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
  let completedEarly = false;
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
      completedEarly = true;
      break;
    }

    changed.push(...result.changed);

    if (result.isDone || !result.continueCursor) {
      completedEarly = true;
      break;
    }

    cursor = result.continueCursor;
  }

  await step.do(
    "enqueue-content-sync-jobs",
    workflowStepRetryPolicy.repoSkillsDiscoveryFanout,
    () => scheduleDiscoveryJobs(activeDeps.skillsDiscoveryScheduler, changed),
  );

  if (completedEarly) {
    return {
      changedCount: changed.length,
      continueCursor: "",
      processedPages,
      status: "completed",
    } as const;
  }

  return {
    changedCount: changed.length,
    continueCursor: cursor ?? "",
    processedPages,
    status: "partial",
  } as const;
};
