import { z } from "zod";

import { baseContract } from "./common/base";

const skillMetricsInputSchema = z.object({
  skillId: z.string().min(1),
});

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

const skillMetricsResponseSchema = z.object({
  allTime: z.number().int().nonnegative(),
  daily: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime({ offset: true }),
  weekly: z.number().int().nonnegative(),
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

const recordSkillViewInputSchema = z.object({
  path: z.string().min(1).optional(),
  skillId: z.string().min(1),
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
  getSkillDownloadMetrics: baseContract
    .route({
      description: "Returns aggregated download metrics for a public skill.",
      method: "GET",
      path: "/metrics/skills/download",
      tags: ["Metrics"],
      successDescription: "Skill download metrics",
      summary: "Read skill download metrics",
    })
    .input(skillMetricsInputSchema)
    .output(skillMetricsResponseSchema),
  getSkillViewMetrics: baseContract
    .route({
      description: "Returns aggregated view metrics for a public skill.",
      method: "GET",
      path: "/metrics/skills/view",
      tags: ["Metrics"],
      successDescription: "Skill view metrics",
      summary: "Read skill view metrics",
    })
    .input(skillMetricsInputSchema)
    .output(skillMetricsResponseSchema),
  recordSkillView: baseContract
    .route({
      description: "Records a view event for a public skill.",
      method: "POST",
      path: "/metrics/skills/view/record",
      tags: ["Metrics"],
      successDescription: "Skill view recorded",
      summary: "Record a skill view",
    })
    .input(recordSkillViewInputSchema)
    .output(z.object({ ok: z.literal(true) })),
};

export type MetricsContract = typeof metricsContract;
