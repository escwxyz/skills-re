import type { DailyMetricsRow, ListDailyMetricsInput, RefreshDailyMetricsInput } from "./repo";

interface MetricsServiceDeps {
  listDailySkillsAndSnapshotsMetrics: (input?: ListDailyMetricsInput) => Promise<DailyMetricsRow[]>;
  refreshDailySkillsAndSnapshotsMetrics: (input?: RefreshDailyMetricsInput) => Promise<{
    days: number;
    fromDay: string;
    toDay: string;
    updatedAtMs: number;
  }>;
}

const defaultDeps: MetricsServiceDeps = {
  listDailySkillsAndSnapshotsMetrics: async (input) => {
    const { listDailySkillsAndSnapshotsMetrics } = await import("./repo");
    return await listDailySkillsAndSnapshotsMetrics(input);
  },
  refreshDailySkillsAndSnapshotsMetrics: async (input) => {
    const { refreshDailySkillsAndSnapshotsMetrics } = await import("./repo");
    return await refreshDailySkillsAndSnapshotsMetrics(input);
  },
};

export const createMetricsService = (overrides: Partial<MetricsServiceDeps> = {}) => {
  const deps = {
    ...defaultDeps,
    ...overrides,
  };

  return {
    async dailySkillsSnapshots(input?: ListDailyMetricsInput) {
      return await deps.listDailySkillsAndSnapshotsMetrics(input);
    },

    async refreshDailySkillsSnapshots(input?: RefreshDailyMetricsInput) {
      return await deps.refreshDailySkillsAndSnapshotsMetrics(input);
    },
  };
};

export const metricsService = createMetricsService();

export async function dailySkillsSnapshots(input?: ListDailyMetricsInput) {
  return await metricsService.dailySkillsSnapshots(input);
}

export async function refreshDailySkillsSnapshots(input?: RefreshDailyMetricsInput) {
  return await metricsService.refreshDailySkillsSnapshots(input);
}
