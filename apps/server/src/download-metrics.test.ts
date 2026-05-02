/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createDownloadMetricsRecorder } from "./download-metrics";
import { createWorkerLogger } from "./worker-logger";

describe("createDownloadMetricsRecorder", () => {
  test("swallows dataset write failures", async () => {
    const originalConsoleError = console.error;
    const logs: unknown[] = [];
    console.error = (...args: unknown[]) => {
      logs.push(args[0]);
    };

    try {
      const recorder = createDownloadMetricsRecorder({
        DOWNLOAD_EVENTS: {
          writeDataPoint() {
            throw new Error("boom");
          },
        },
      });

      await expect(
        recorder({
          skillId: "skill-1",
          version: "1.0.0",
        }),
      ).resolves.toBeUndefined();
    } finally {
      console.error = originalConsoleError;
    }

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      component: "download.metrics",
      error: {
        message: "boom",
        name: "Error",
      },
      event: "download.metrics.failed",
      level: "error",
    });
  });

  test("includes request correlation and download identifiers when logging failures", async () => {
    const originalConsoleError = console.error;
    const logs: unknown[] = [];
    console.error = (...args: unknown[]) => {
      logs.push(args[0]);
    };

    try {
      const recorder = createDownloadMetricsRecorder(
        {
          DOWNLOAD_EVENTS: {
            writeDataPoint() {
              throw new Error("boom");
            },
          },
        },
        createWorkerLogger({
          component: "http",
          requestId: "request-1",
        }),
      );

      await recorder({
        skillId: "skill-1",
        version: "1.0.0",
      });
    } finally {
      console.error = originalConsoleError;
    }

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      component: "download.metrics",
      error: {
        message: "boom",
        name: "Error",
      },
      event: "download.metrics.failed",
      level: "error",
      requestId: "request-1",
      skillId: "skill-1",
      version: "1.0.0",
    });
  });
});
