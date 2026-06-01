import { reposService } from "@skills-re/api/modules/repos/service";
import { refreshDailySkillsSnapshots } from "@skills-re/api/modules";

import { logHandledError } from "./logging";
import { getRepoStatsSyncWorkflowScheduler } from "./workflows/repo-stats";
import { getRepoSkillsDiscoveryWorkflowScheduler } from "./workflows/repo-skills-discovery-scheduler";
import { createWorkerLogger } from "./worker-logger";
import type { WorkerLogger } from "./worker-logger";

export const REPO_STATS_SYNC_CRON = "0 */6 * * *";
export const REPO_SKILLS_DISCOVERY_CRON = "15 */6 * * *";
export const DAILY_METRICS_REFRESH_CRON = "30 0 * * *";

const DEFAULT_REPO_STATS_SYNC_LIMIT = 20;
const DEFAULT_REPO_STATS_SYNC_MAX_PAGES = 5;
const DEFAULT_REPO_SKILLS_DISCOVERY_LIMIT = 20;
const DEFAULT_REPO_SKILLS_DISCOVERY_MAX_PAGES = 5;

export interface ScheduledJob {
  cron: string;
  name: string;
  run: () => Promise<void>;
}

type ListReposPage = typeof reposService.listPage;
type RepoStatsSchedulerFactory = typeof getRepoStatsSyncWorkflowScheduler;
type RepoSkillsDiscoverySchedulerFactory = typeof getRepoSkillsDiscoveryWorkflowScheduler;

type RefreshDailyMetricsFn = typeof refreshDailySkillsSnapshots;

export interface RepoSyncCronDeps {
  refreshDailySkillsSnapshots?: RefreshDailyMetricsFn;
  getRepoSkillsDiscoveryWorkflowScheduler?: RepoSkillsDiscoverySchedulerFactory;
  getRepoStatsSyncWorkflowScheduler?: RepoStatsSchedulerFactory;
  listReposPage?: ListReposPage;
  logger?: WorkerLogger;
}

const getEnvString = (env: Env, key: string) => {
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
};

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getRepoStatsSyncLimit = (env: Env) =>
  parsePositiveInteger(getEnvString(env, "REPO_STATS_SYNC_LIMIT"), DEFAULT_REPO_STATS_SYNC_LIMIT);

const getRepoStatsSyncMaxPages = (env: Env) =>
  parsePositiveInteger(
    getEnvString(env, "REPO_STATS_SYNC_MAX_PAGES"),
    DEFAULT_REPO_STATS_SYNC_MAX_PAGES,
  );

const getRepoSkillsDiscoveryLimit = (env: Env) =>
  parsePositiveInteger(
    getEnvString(env, "REPO_SKILLS_DISCOVERY_LIMIT"),
    DEFAULT_REPO_SKILLS_DISCOVERY_LIMIT,
  );

const getRepoSkillsDiscoveryMaxPages = (env: Env) =>
  parsePositiveInteger(
    getEnvString(env, "REPO_SKILLS_DISCOVERY_MAX_PAGES"),
    DEFAULT_REPO_SKILLS_DISCOVERY_MAX_PAGES,
  );

export const enqueueScheduledRepoStatsSync = async (env: Env, deps: RepoSyncCronDeps = {}) => {
  const scheduler = (deps.getRepoStatsSyncWorkflowScheduler ?? getRepoStatsSyncWorkflowScheduler)(
    env,
    { logger: deps.logger },
  );
  return await reposService.enqueueStatsSync(scheduler, {
    limit: getRepoStatsSyncLimit(env),
    maxPages: getRepoStatsSyncMaxPages(env),
  });
};

export const enqueueScheduledRepoSkillsDiscovery = async (
  env: Env,
  deps: RepoSyncCronDeps = {},
) => {
  const scheduler = (
    deps.getRepoSkillsDiscoveryWorkflowScheduler ?? getRepoSkillsDiscoveryWorkflowScheduler
  )(env);
  if (!scheduler) {
    throw new Error("Repo skills discovery workflow is not configured.");
  }

  const listReposPage = deps.listReposPage ?? reposService.listPage;
  const limit = getRepoSkillsDiscoveryLimit(env);
  const maxPages = getRepoSkillsDiscoveryMaxPages(env);
  let cursor: string | undefined;
  let pages = 0;
  let scheduledCount = 0;

  while (pages < maxPages) {
    const page = await listReposPage({
      cursor,
      limit,
    });
    pages += 1;

    await Promise.all(
      page.repos.map(async (repo) => {
        await scheduler.enqueue({
          repoName: repo.repoName,
          repoOwner: repo.repoOwner,
        });
      }),
    );
    scheduledCount += page.repos.length;

    if (page.isDone || !page.continueCursor) {
      return {
        continueCursor: "",
        pages,
        scheduledCount,
        status: "completed" as const,
      };
    }

    cursor = page.continueCursor;
  }

  return {
    continueCursor: cursor ?? "",
    pages,
    scheduledCount,
    status: "partial" as const,
  };
};

export const getScheduledJobs = (env: Env, deps: RepoSyncCronDeps = {}): ScheduledJob[] => {
  const logger = deps.logger ?? createWorkerLogger({ component: "cron" });
  const refreshMetrics = deps.refreshDailySkillsSnapshots ?? refreshDailySkillsSnapshots;

  return [
    {
      cron: REPO_STATS_SYNC_CRON,
      name: "repo-stats-sync",
      run: async () => {
        const result = await enqueueScheduledRepoStatsSync(env, { ...deps, logger });
        logger.info("cron.job.completed", {
          job: "repo-stats-sync",
          workId: result.workId,
        });
      },
    },
    {
      cron: REPO_SKILLS_DISCOVERY_CRON,
      name: "repo-skills-discovery",
      run: async () => {
        const result = await enqueueScheduledRepoSkillsDiscovery(env, { ...deps, logger });
        logger.info("cron.job.completed", {
          continueCursor: result.continueCursor,
          job: "repo-skills-discovery",
          pages: result.pages,
          scheduledCount: result.scheduledCount,
          status: result.status,
        });
      },
    },
    {
      cron: DAILY_METRICS_REFRESH_CRON,
      name: "daily-metrics-refresh",
      run: async () => {
        const result = await refreshMetrics();
        logger.info("cron.job.completed", {
          days: result.days,
          fromDay: result.fromDay,
          job: "daily-metrics-refresh",
          toDay: result.toDay,
        });
      },
    },
  ];
};

const runJobSafely = async (
  controller: Pick<ScheduledController, "cron">,
  job: ScheduledJob,
  logger: WorkerLogger,
) => {
  try {
    await job.run();
  } catch (error) {
    logHandledError({
      component: "cron",
      error,
      event: "cron.job.failed",
      fields: {
        cron: controller.cron,
        job: job.name,
      },
      logger,
    });
  }
};

export const runScheduledJobs = (
  controller: Pick<ScheduledController, "cron">,
  env: Env,
  ctx: Pick<ExecutionContext, "waitUntil">,
  deps: RepoSyncCronDeps = {},
) => {
  const logger = deps.logger ?? createWorkerLogger({ component: "cron" });
  const jobs = getScheduledJobs(env, { ...deps, logger }).filter(
    (job) => job.cron === controller.cron,
  );

  if (jobs.length === 0) {
    logger.info("cron.unmatched", {
      cron: controller.cron,
    });
    return;
  }

  for (const job of jobs) {
    ctx.waitUntil(runJobSafely(controller, job, logger));
  }
};
