/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createDownloadMetricsRecorder, createDownloadMetricsService } from "./downloads";

const createFakeKv = (initialValues: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initialValues));
  const calls: { kind: string; key: string; value?: string }[] = [];

  const kv = {
    delete(key: string) {
      calls.push({ key, kind: "delete" });
      values.delete(key);
      return Promise.resolve();
    },
    get<T>(key: string) {
      calls.push({ key, kind: "get" });
      const value = values.get(key);
      if (value === undefined) {
        return Promise.resolve(null as T);
      }
      try {
        return Promise.resolve(JSON.parse(value) as T);
      } catch {
        return Promise.resolve(value as T);
      }
    },
    put(key: string, value: string) {
      calls.push({ key, kind: "put", value });
      values.set(key, value);
      return Promise.resolve();
    },
  };

  return {
    calls,
    kv: kv as unknown as KVNamespace,
    values,
  };
};

describe("createDownloadMetricsRecorder", () => {
  test("swallows dataset write failures", async () => {
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
        undefined,
        {
          findSkillDownloadsAllTime: () => Promise.resolve(0),
          incrementSkillDownloadsAllTime: () => Promise.resolve(),
        },
      );

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
    const logs: { event: string; fields: Record<string, unknown> }[] = [];

    const recorder = createDownloadMetricsRecorder(
      {
        DOWNLOAD_EVENTS: {
          writeDataPoint() {
            throw new Error("boom");
          },
        },
      },
      {
        error(event, fields) {
          logs.push({ event, fields: fields ?? {} });
        },
      } as never,
      {
        findSkillDownloadsAllTime: () => Promise.resolve(0),
        incrementSkillDownloadsAllTime: () => Promise.resolve(),
      },
    );

    await recorder({
      skillId: "skill-1",
      version: "1.0.0",
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      event: "download.metrics.failed",
      fields: {
        skillId: "skill-1",
        version: "1.0.0",
      },
    });
    expect(logs[0].fields.error).toMatchObject({
      message: "boom",
      name: "Error",
    });
  });

  test("updates all-time and kv counters when recording a download", async () => {
    const fakeKv = createFakeKv();
    const increments: string[] = [];
    const writes: unknown[] = [];
    const service = createDownloadMetricsService({
      downloadEvents: {
        writeDataPoint(dataPoint: unknown) {
          writes.push(dataPoint);
        },
      } as unknown as AnalyticsEngineDataset,
      findSkillDownloadsAllTime: () => Promise.resolve(0),
      incrementSkillDownloadsAllTime: (skillId) => {
        increments.push(skillId);
        return Promise.resolve();
      },
      metricsCache: fakeKv.kv,
      nowMs: () => Date.parse("2024-01-07T12:00:00Z"),
    });

    await service.recordSuccessfulSkillDownload({
      skillId: "skill-1",
      version: "1.0.0",
    });

    expect(increments).toEqual(["skill-1"]);
    expect(writes).toEqual([
      {
        blobs: ["skill-1", "1.0.0"],
        indexes: ["skill-1"],
      },
    ]);
    expect(fakeKv.calls).toEqual([
      {
        kind: "get",
        key: "skill:download-daily:skill-1:2024-01-07",
      },
      {
        kind: "put",
        key: "skill:download-daily:skill-1:2024-01-07",
        value: "1",
      },
      {
        kind: "delete",
        key: "skill:download-metrics:v1:skill-1",
      },
    ]);
  });

  test("reads metrics from kv counters and caches the result", async () => {
    const fakeKv = createFakeKv();
    fakeKv.values.set("skill:download-daily:skill-1:2024-01-07", "2");
    fakeKv.values.set("skill:download-daily:skill-1:2024-01-06", "5");
    const service = createDownloadMetricsService({
      findSkillDownloadsAllTime: () => Promise.resolve(42),
      metricsCache: fakeKv.kv,
      nowMs: () => Date.parse("2024-01-07T12:00:00Z"),
    });

    await expect(service.getSkillDownloadMetrics("skill-1")).resolves.toMatchObject({
      allTime: 42,
      daily: 2,
      weekly: 7,
    });

    expect(
      fakeKv.calls.some(
        (call) => call.kind === "put" && call.key === "skill:download-metrics:v1:skill-1",
      ),
    ).toBe(true);
  });

  test("returns cached metrics when available", async () => {
    const fakeKv = createFakeKv({
      "skill:download-daily:skill-1:2024-01-07": "3",
      "skill:download-daily:skill-1:2024-01-06": "2",
      "skill:download-daily:skill-1:2024-01-05": "1",
      "skill:download-metrics:v1:skill-1": JSON.stringify({
        allTime: 8,
        daily: 3,
        updatedAt: "2024-01-07T12:00:00.000Z",
        weekly: 6,
      }),
    });
    const service = createDownloadMetricsService({
      metricsCache: fakeKv.kv,
      nowMs: () => Date.parse("2024-01-07T12:00:00Z"),
    });

    await expect(service.getSkillDownloadMetrics("skill-1")).resolves.toMatchObject({
      allTime: 8,
      daily: 3,
      weekly: 6,
    });

    expect(
      fakeKv.calls.some(
        (call) => call.kind === "get" && call.key === "skill:download-metrics:v1:skill-1",
      ),
    ).toBe(true);
  });
});
