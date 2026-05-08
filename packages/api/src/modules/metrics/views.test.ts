/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createViewMetricsService } from "./views";

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

describe("view metrics", () => {
  test("records a view event and updates counters", async () => {
    const fakeKv = createFakeKv();
    const increments: string[] = [];
    const writes: unknown[] = [];
    const service = createViewMetricsService({
      incrementSkillViewsAllTime: (skillId) => {
        increments.push(skillId);
        return Promise.resolve();
      },
      metricsCache: fakeKv.kv,
      nowMs: () => Date.parse("2024-01-07T12:00:00Z"),
      viewEvents: {
        writeDataPoint(dataPoint: unknown) {
          writes.push(dataPoint);
        },
      } as unknown as AnalyticsEngineDataset,
    });

    await service.recordSkillView({
      path: "/skills/acme/widget",
      skillId: "skill-1",
    });

    expect(increments).toEqual(["skill-1"]);
    expect(writes).toEqual([
      {
        blobs: ["skill-1", "/skills/acme/widget", "2024-01-07"],
        indexes: ["skill-1"],
      },
    ]);
    expect(fakeKv.calls).toEqual([
      {
        kind: "get",
        key: "skill:view-daily:skill-1:2024-01-07",
      },
      {
        kind: "put",
        key: "skill:view-daily:skill-1:2024-01-07",
        value: "1",
      },
      {
        kind: "delete",
        key: "skill:view-metrics:v1:skill-1",
      },
    ]);
  });

  test("reads view metrics from kv counters and caches the result", async () => {
    const fakeKv = createFakeKv();
    fakeKv.values.set("skill:view-daily:skill-1:2024-01-07", "4");
    fakeKv.values.set("skill:view-daily:skill-1:2024-01-06", "5");
    const service = createViewMetricsService({
      findSkillViewsAllTime: () => Promise.resolve(11),
      metricsCache: fakeKv.kv,
      nowMs: () => Date.parse("2024-01-07T12:00:00Z"),
    });

    await expect(service.getSkillViewMetrics("skill-1")).resolves.toMatchObject({
      allTime: 11,
      daily: 4,
      weekly: 9,
    });

    expect(
      fakeKv.calls.some(
        (call) => call.kind === "put" && call.key === "skill:view-metrics:v1:skill-1",
      ),
    ).toBe(true);
  });
});
