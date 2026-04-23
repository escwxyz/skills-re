/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createMetricsService } from "./service";

describe("metrics service", () => {
  test("forwards list and refresh calls to the repo layer", async () => {
    const calls: unknown[] = [];
    const service = createMetricsService({
      listDailySkillsAndSnapshotsMetrics: (input) => {
        calls.push({ kind: "list", input });
        return [
          {
            day: "2024-01-01",
            newSkills: 1,
            newSnapshots: 2,
            updatedAtMs: 3,
          },
        ];
      },
      refreshDailySkillsAndSnapshotsMetrics: (input) => {
        calls.push({ kind: "refresh", input });
        return {
          days: 7,
          fromDay: "2024-01-01",
          toDay: "2024-01-07",
          updatedAtMs: 123,
        };
      },
    });

    await expect(
      service.dailySkillsSnapshots({
        fromDay: "2024-01-01",
        limit: 10,
        toDay: "2024-01-07",
      }),
    ).resolves.toEqual([
      {
        day: "2024-01-01",
        newSkills: 1,
        newSnapshots: 2,
        updatedAtMs: 3,
      },
    ]);

    await expect(service.refreshDailySkillsSnapshots({ backfillDays: 7 })).resolves.toEqual({
      days: 7,
      fromDay: "2024-01-01",
      toDay: "2024-01-07",
      updatedAtMs: 123,
    });

    expect(calls).toEqual([
      {
        input: {
          fromDay: "2024-01-01",
          limit: 10,
          toDay: "2024-01-07",
        },
        kind: "list",
      },
      {
        input: {
          backfillDays: 7,
        },
        kind: "refresh",
      },
    ]);
  });
});
