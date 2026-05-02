import { logHandledError } from "./logging";
import type { WorkerLogger } from "./worker-logger";

interface DownloadEventsDataset {
  writeDataPoint(dataPoint: { blobs: [string, string] }): void;
}

interface DownloadMetricsEnv {
  DOWNLOAD_EVENTS?: DownloadEventsDataset;
}

export const createDownloadMetricsRecorder = (env: DownloadMetricsEnv, logger?: WorkerLogger) => {
  const dataset = env.DOWNLOAD_EVENTS;
  const metricsLogger = logger?.child({ component: "download.metrics" });

  return async (input: { skillId: string; version: string }) => {
    if (!dataset) {
      return;
    }

    try {
      await Promise.resolve(
        dataset.writeDataPoint({
          blobs: [input.skillId, input.version],
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
        logger: metricsLogger,
      });
    }
  };
};
