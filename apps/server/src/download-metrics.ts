interface DownloadEventsDataset {
  writeDataPoint(dataPoint: { blobs: [string, string] }): void;
}

interface DownloadMetricsEnv {
  DOWNLOAD_EVENTS?: DownloadEventsDataset;
}

export const createDownloadMetricsRecorder = (env: DownloadMetricsEnv) => {
  const dataset = env.DOWNLOAD_EVENTS;

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
      console.warn("Failed to record download metrics.", error);
    }
  };
};
