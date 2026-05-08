import { asSkillId } from "@skills-re/db/utils";

import {
  findSkillViewsAllTime as findSkillViewsAllTimeRepo,
  incrementSkillViewsAllTime as incrementSkillViewsAllTimeRepo,
} from "../skills/repo";
import type { WorkerLogger } from "../../types";

import {
  deleteMetricsCache,
  getMetricsCacheKey,
  incrementKvDailyCounter,
  queryWeeklyDailyFromKv,
  readMetricsCache,
  toDayBucket,
  writeMetricsCache,
} from "./shared";
import type { SkillMetricsResult } from "./shared";

const VIEW_METRICS_CACHE_PREFIX = "view-metrics";
const VIEW_DAILY_COUNTER_PREFIX = "view";

export type SkillViewMetrics = SkillMetricsResult;

export interface ViewMetricsEnv {
  METRICS_CACHE?: KVNamespace;
  VIEW_EVENTS?: AnalyticsEngineDataset;
}

export interface ViewMetricsServiceDeps {
  env?: ViewMetricsEnv;
  findSkillViewsAllTime?: (skillId: string) => Promise<number>;
  incrementSkillViewsAllTime?: (skillId: string) => Promise<void>;
  logger?: WorkerLogger;
  metricsCache?: KVNamespace | null;
  nowMs?: () => number;
  viewEvents?: AnalyticsEngineDataset | null;
}

const normalizeDependencies = (overrides: ViewMetricsServiceDeps = {}) => {
  const env = overrides.env ?? {};
  const viewEvents = overrides.viewEvents ?? env.VIEW_EVENTS ?? null;
  const metricsCache = overrides.metricsCache ?? env.METRICS_CACHE ?? null;
  const nowMs = overrides.nowMs ?? Date.now;
  const findAllTime =
    overrides.findSkillViewsAllTime ??
    (async (skillId: string) => await findSkillViewsAllTimeRepo(asSkillId(skillId)));
  const incrementAllTime =
    overrides.incrementSkillViewsAllTime ??
    (async (skillId: string) => await incrementSkillViewsAllTimeRepo(asSkillId(skillId)));

  return {
    env,
    findAllTime,
    incrementAllTime,
    logger: overrides.logger,
    metricsCache,
    nowMs,
    viewEvents,
  };
};

export const createViewMetricsService = (overrides: ViewMetricsServiceDeps = {}) => {
  const deps = normalizeDependencies(overrides);

  return {
    async getSkillViewMetrics(skillId: string): Promise<SkillViewMetrics> {
      const cacheKey = getMetricsCacheKey(VIEW_METRICS_CACHE_PREFIX, skillId);
      const cached = await readMetricsCache<SkillViewMetrics>(deps.metricsCache, cacheKey);
      if (cached) {
        return cached;
      }

      let allTime = 0;
      try {
        allTime = await deps.findAllTime(skillId);
      } catch (error) {
        console.error("[view.metrics] all-time counter read failed", {
          error: error instanceof Error ? error.message : String(error),
          skillId,
        });
      }

      const recent = await queryWeeklyDailyFromKv(
        deps.metricsCache,
        VIEW_DAILY_COUNTER_PREFIX,
        skillId,
        deps.nowMs(),
      ).catch((error) => {
        console.error("[view.metrics] kv query failed", {
          error: error instanceof Error ? error.message : String(error),
          skillId,
        });

        return {
          daily: 0,
          weekly: 0,
        };
      });

      const result: SkillViewMetrics = {
        allTime,
        daily: recent.daily,
        updatedAt: new Date(deps.nowMs()).toISOString(),
        weekly: recent.weekly,
      };

      try {
        await writeMetricsCache(deps.metricsCache, cacheKey, result);
      } catch (error) {
        console.error("[view.metrics] metrics cache write failed", {
          error: error instanceof Error ? error.message : String(error),
          skillId,
        });
      }
      return result;
    },

    async recordSkillView(input: { path?: string; skillId: string }) {
      try {
        await deps.incrementAllTime(input.skillId);
      } catch (error) {
        console.error("[view.metrics] all-time counter update failed", {
          error: error instanceof Error ? error.message : String(error),
          skillId: input.skillId,
        });
      }

      if (deps.viewEvents) {
        try {
          await Promise.resolve(
            deps.viewEvents.writeDataPoint({
              blobs: [input.skillId, input.path ?? "", toDayBucket(deps.nowMs())],
              indexes: [input.skillId],
            }),
          );
        } catch (error) {
          console.error("[view.metrics] analytics-engine write failed", {
            error: error instanceof Error ? error.message : String(error),
            path: input.path,
            skillId: input.skillId,
          });
        }
      }

      try {
        try {
          await incrementKvDailyCounter(
            deps.metricsCache,
            VIEW_DAILY_COUNTER_PREFIX,
            input.skillId,
            deps.nowMs(),
          );
        } catch (error) {
          console.error("[view.metrics] kv daily counter update failed", {
            error: error instanceof Error ? error.message : String(error),
            skillId: input.skillId,
          });
        }

        try {
          await deleteMetricsCache(
            deps.metricsCache,
            getMetricsCacheKey(VIEW_METRICS_CACHE_PREFIX, input.skillId),
          );
        } catch (error) {
          console.error("[view.metrics] metrics cache delete failed", {
            error: error instanceof Error ? error.message : String(error),
            skillId: input.skillId,
          });
        }
      } catch (error) {
        console.error("[view.metrics] metrics write failed", {
          error: error instanceof Error ? error.message : String(error),
          skillId: input.skillId,
        });
      }
    },
  };
};

export async function getSkillViewMetrics(input: { skillId: string }, env: ViewMetricsEnv = {}) {
  return await createViewMetricsService({ env }).getSkillViewMetrics(input.skillId);
}

export async function recordSkillView(
  input: { path?: string; skillId: string },
  env: ViewMetricsEnv = {},
  logger?: WorkerLogger,
) {
  return await createViewMetricsService({ env, logger }).recordSkillView(input);
}
