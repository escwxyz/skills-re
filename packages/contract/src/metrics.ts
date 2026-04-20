import { z } from "zod";

import { baseContract } from "./common/base";

const dailyMetricsQueryInputSchema = z
  .object({
    fromDay: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    limit: z.number().int().min(1).max(365).optional(),
    toDay: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .optional();

const dailyMetricPointSchema = z.object({
  day: z.string(),
  newSkills: z.number().int().nonnegative(),
  newSnapshots: z.number().int().nonnegative(),
  updatedAtMs: z.number().int().nonnegative(),
});

const refreshDailyMetricsInputSchema = z
  .object({
    backfillDays: z.number().int().min(1).max(365).optional(),
  })
  .optional();

const refreshDailyMetricsResultSchema = z.object({
  days: z.number().int().min(1).max(365),
  fromDay: z.string(),
  toDay: z.string(),
  updatedAtMs: z.number().int().nonnegative(),
});

export const metricsContract = {
  dailySkillsSnapshots: baseContract
    .route({
      description: "Returns the daily skills and snapshots metrics series for charts and reports.",
      method: "GET",
      path: "/metrics/daily-skills-snapshots",
      tags: ["Metrics"],
      successDescription: "Daily metrics series",
      summary: "List daily skills and snapshots metrics",
    })
    .input(dailyMetricsQueryInputSchema)
    .output(z.array(dailyMetricPointSchema)),
  refreshDailySkillsSnapshots: baseContract
    .route({
      description: "Refreshes the daily skills and snapshots metrics materialization.",
      method: "POST",
      path: "/metrics/refresh-daily-skills-snapshots",
      tags: ["Metrics"],
      successDescription: "Metrics refresh result",
      summary: "Refresh daily skills and snapshots metrics",
    })
    .input(refreshDailyMetricsInputSchema)
    .output(refreshDailyMetricsResultSchema),
};

export type MetricsContract = typeof metricsContract;
