import { asSkillId } from "@skills-re/db/utils";

import {
  findSkillDownloadsAllTime as findSkillDownloadsAllTimeRepo,
  incrementSkillDownloadsAllTime as incrementSkillDownloadsAllTimeRepo,
} from "../skills/repo";
import type { WorkerLogger } from "../../types";

import {
  deleteMetricsCache,
  getMetricsCacheKey,
  incrementKvDailyCounter,
  queryWeeklyDailyFromKv,
  readMetricsCache,
  writeMetricsCache,
} from "./shared";
import type { SkillMetricsResult } from "./shared";
import { logHandledError } from "./logging";

const DOWNLOAD_METRICS_CACHE_PREFIX = "download-metrics";
const DOWNLOAD_DAILY_COUNTER_PREFIX = "download";

export type SkillDownloadMetrics = SkillMetricsResult;

export interface DownloadMetricsEnv {
  DOWNLOAD_EVENTS?: AnalyticsEngineDataset;
  METRICS_CACHE?: KVNamespace;
}

export interface DownloadMetricsServiceDeps {
  downloadEvents?: AnalyticsEngineDataset | null;
  env?: DownloadMetricsEnv;
  findSkillDownloadsAllTime?: (skillId: string) => Promise<number>;
  incrementSkillDownloadsAllTime?: (skillId: string) => Promise<void>;
  logger?: WorkerLogger;
  metricsCache?: KVNamespace | null;
  nowMs?: () => number;
}

const normalizeDependencies = (overrides: DownloadMetricsServiceDeps = {}) => {
  const env = overrides.env ?? {};
  const downloadEvents = overrides.downloadEvents ?? env.DOWNLOAD_EVENTS ?? null;
  const metricsCache = overrides.metricsCache ?? env.METRICS_CACHE ?? null;
  const nowMs = overrides.nowMs ?? Date.now;
  const findAllTime =
    overrides.findSkillDownloadsAllTime ??
    (async (skillId: string) => await findSkillDownloadsAllTimeRepo(asSkillId(skillId)));
  const incrementAllTime =
    overrides.incrementSkillDownloadsAllTime ??
    (async (skillId: string) => await incrementSkillDownloadsAllTimeRepo(asSkillId(skillId)));

  return {
    downloadEvents,
    env,
    findAllTime,
    incrementAllTime,
    logger: overrides.logger,
    metricsCache,
    nowMs,
  };
};

export const createDownloadMetricsService = (overrides: DownloadMetricsServiceDeps = {}) => {
  const deps = normalizeDependencies(overrides);

  return {
    async getSkillDownloadMetrics(skillId: string): Promise<SkillDownloadMetrics> {
      const cacheKey = getMetricsCacheKey(DOWNLOAD_METRICS_CACHE_PREFIX, skillId);
      const cached = await readMetricsCache<SkillDownloadMetrics>(deps.metricsCache, cacheKey);
      if (cached) {
        return cached;
      }

      let allTime = 0;
      try {
        allTime = await deps.findAllTime(skillId);
      } catch (error) {
        console.error("[download.metrics] all-time counter read failed", {
          error: error instanceof Error ? error.message : String(error),
          skillId,
        });
      }

      const recent = await queryWeeklyDailyFromKv(
        deps.metricsCache,
        DOWNLOAD_DAILY_COUNTER_PREFIX,
        skillId,
        deps.nowMs(),
      ).catch((error) => {
        console.error("[download.metrics] kv query failed", {
          error: error instanceof Error ? error.message : String(error),
          skillId,
        });

        return {
          daily: 0,
          weekly: 0,
        };
      });

      const result: SkillDownloadMetrics = {
        allTime,
        daily: recent.daily,
        updatedAt: new Date(deps.nowMs()).toISOString(),
        weekly: recent.weekly,
      };

      try {
        await writeMetricsCache(deps.metricsCache, cacheKey, result);
      } catch (error) {
        console.error("[download.metrics] metrics cache write failed", {
          error: error instanceof Error ? error.message : String(error),
          skillId,
        });
      }
      return result;
    },

    async recordSuccessfulSkillDownload(input: { skillId: string; version: string }) {
      try {
        await deps.incrementAllTime(input.skillId);
      } catch (error) {
        console.error("[download.metrics] all-time counter update failed", {
          error: error instanceof Error ? error.message : String(error),
          skillId: input.skillId,
        });
      }

      if (deps.downloadEvents) {
        try {
          await Promise.resolve(
            deps.downloadEvents.writeDataPoint({
              blobs: [input.skillId, input.version],
              indexes: [input.skillId],
            }),
          );
        } catch (error) {
          logHandledError({
            component: "download.metrics",
            error,
            event: "download.metrics.failed",
            fields: {
              skillId: input.skillId,
              version: input.version,
            },
            logger: deps.logger,
          });
        }
      }

      try {
        try {
          await incrementKvDailyCounter(
            deps.metricsCache,
            DOWNLOAD_DAILY_COUNTER_PREFIX,
            input.skillId,
            deps.nowMs(),
          );
        } catch (error) {
          console.error("[download.metrics] kv daily counter update failed", {
            error: error instanceof Error ? error.message : String(error),
            skillId: input.skillId,
          });
        }

        try {
          await deleteMetricsCache(
            deps.metricsCache,
            getMetricsCacheKey(DOWNLOAD_METRICS_CACHE_PREFIX, input.skillId),
          );
        } catch (error) {
          console.error("[download.metrics] metrics cache delete failed", {
            error: error instanceof Error ? error.message : String(error),
            skillId: input.skillId,
          });
        }
      } catch (error) {
        console.error("[download.metrics] metrics write failed", {
          error: error instanceof Error ? error.message : String(error),
          skillId: input.skillId,
        });
      }
    },
  };
};

export const createDownloadMetricsRecorder = (
  env: DownloadMetricsEnv,
  logger?: WorkerLogger,
  overrides: Partial<DownloadMetricsServiceDeps> = {},
) => {
  const service = createDownloadMetricsService({ ...overrides, env, logger });
  return service.recordSuccessfulSkillDownload;
};

export async function getSkillDownloadMetrics(
  input: { skillId: string },
  env: DownloadMetricsEnv = {},
) {
  return await createDownloadMetricsService({ env }).getSkillDownloadMetrics(input.skillId);
}

export async function recordSuccessfulSkillDownload(
  input: { skillId: string; version: string },
  env: DownloadMetricsEnv = {},
  logger?: WorkerLogger,
) {
  return await createDownloadMetricsService({ env, logger }).recordSuccessfulSkillDownload(input);
}
