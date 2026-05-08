import { adminProcedure, publicProcedure } from "../procedures";
import {
  dailySkillsSnapshots,
  getSkillDownloadMetrics,
  getSkillViewMetrics,
  recordSkillView,
  refreshDailySkillsSnapshots,
} from "../modules";

export const metricsRouter = {
  dailySkillsSnapshots: publicProcedure.metrics.dailySkillsSnapshots.handler(({ input }) =>
    dailySkillsSnapshots(input),
  ),
  getSkillDownloadMetrics: publicProcedure.metrics.getSkillDownloadMetrics.handler(
    ({ input, context }) => getSkillDownloadMetrics(input, context.metrics),
  ),
  getSkillViewMetrics: publicProcedure.metrics.getSkillViewMetrics.handler(({ input, context }) =>
    getSkillViewMetrics(input, context.metrics),
  ),
  recordSkillView: publicProcedure.metrics.recordSkillView.handler(async ({ input, context }) => {
    await recordSkillView(input, context.metrics, context.workerLogger);
    return { ok: true as const };
  }),
  refreshDailySkillsSnapshots: adminProcedure.metrics.refreshDailySkillsSnapshots.handler(
    ({ input }) => refreshDailySkillsSnapshots(input),
  ),
} as const;
