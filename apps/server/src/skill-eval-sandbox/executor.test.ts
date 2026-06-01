/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createSkillEvalRunQueuePayload, type EvalRunExecutor } from "./executor";

describe("skill eval sandbox executor contract", () => {
  test("creates deterministic queue payloads with explicit timestamps", () => {
    expect(
      createSkillEvalRunQueuePayload({
        includeBaseline: true,
        now: 1_700_000_000_000,
        runId: "run-1",
      }),
    ).toEqual({
      includeBaseline: true,
      requestedAt: 1_700_000_000_000,
      runId: "run-1",
    });
  });

  test("defaults baseline execution off", () => {
    expect(createSkillEvalRunQueuePayload({ now: 1, runId: "run-1" })).toEqual({
      includeBaseline: false,
      requestedAt: 1,
      runId: "run-1",
    });
  });

  test("defines a runtime-neutral executor shape", async () => {
    const executor: EvalRunExecutor = {
      execute: (payload) =>
        Promise.resolve({
          completedAt: payload.requestedAt + 1,
          status: "pass",
          summary: {
            blockedCases: 0,
            failedCases: 0,
            passedCases: 1,
            totalCases: 1,
          },
        }),
    };

    await expect(
      executor.execute(createSkillEvalRunQueuePayload({ now: 10, runId: "run-1" })),
    ).resolves.toEqual({
      completedAt: 11,
      status: "pass",
      summary: {
        blockedCases: 0,
        failedCases: 0,
        passedCases: 1,
        totalCases: 1,
      },
    });
  });
});
