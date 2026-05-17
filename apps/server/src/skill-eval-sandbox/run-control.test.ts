/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  destroySandboxBestEffort,
  EvalRunControlError,
  normalizeEvalRunError,
  runWithTimeoutAndCancellation,
} from "./run-control";

describe("skill eval run control", () => {
  test("returns operation results before the timeout", async () => {
    await expect(
      runWithTimeoutAndCancellation({
        operation: () => Promise.resolve("ok"),
        timeoutMs: 1_000,
      }),
    ).resolves.toBe("ok");
  });

  test("fails with a structured timeout error", async () => {
    await expect(
      runWithTimeoutAndCancellation({
        operation: () => new Promise((resolve) => setTimeout(resolve, 20)),
        timeoutMs: 1,
      }),
    ).rejects.toMatchObject({
      code: "RUN_TIMEOUT",
      terminalStatus: "fail",
    });
  });

  test("fails with a structured cancellation error", async () => {
    const controller = new AbortController();
    const promise = runWithTimeoutAndCancellation({
      operation: () => new Promise((resolve) => setTimeout(resolve, 20)),
      signal: controller.signal,
      timeoutMs: 1_000,
    });
    controller.abort();

    await expect(promise).rejects.toMatchObject({
      code: "RUN_CANCELLED",
      terminalStatus: "cancelled",
    });
  });

  test("normalizes control and generic errors", () => {
    expect(
      normalizeEvalRunError(
        new EvalRunControlError("POLICY_BLOCKED", "Network access denied.", "blocked"),
      ),
    ).toEqual({
      code: "POLICY_BLOCKED",
      message: "Network access denied.",
      terminalStatus: "blocked",
    });

    expect(normalizeEvalRunError(new Error("exec failed"))).toEqual({
      code: "SANDBOX_EXEC_FAILED",
      message: "exec failed",
      terminalStatus: "fail",
    });
  });

  test("destroys sandboxes best effort without throwing cleanup failures", async () => {
    await expect(
      destroySandboxBestEffort({
        runId: "run-1",
        runtime: {
          destroyRunSandbox: () => Promise.resolve(),
        },
      }),
    ).resolves.toEqual({ destroyed: true });

    await expect(
      destroySandboxBestEffort({
        runId: "run-1",
        runtime: {
          destroyRunSandbox: () => Promise.reject(new Error("destroy failed")),
        },
      }),
    ).resolves.toEqual({
      destroyed: false,
      error: {
        code: "SANDBOX_DESTROY_FAILED",
        message: "destroy failed",
        terminalStatus: "fail",
      },
    });
  });
});
