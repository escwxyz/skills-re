/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createDownloadMetricsRecorder } from "./download-metrics";

describe("createDownloadMetricsRecorder", () => {
  test("swallows dataset write failures", async () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
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
      console.warn = originalWarn;
    }

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Failed to record download metrics.");
    expect(warnings[0]).toContain("boom");
  });
});
