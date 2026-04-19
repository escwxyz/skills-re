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

    dataset.writeDataPoint({
      blobs: [input.skillId, input.version],
    });
  };
};
