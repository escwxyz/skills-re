/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { metricsContract } from "./metrics";

describe("metrics contract", () => {
  test("exposes the legacy daily metrics routes", () => {
    expect(metricsContract.dailySkillsSnapshots).toBeDefined();
    expect(metricsContract.refreshDailySkillsSnapshots).toBeDefined();
  });
});
