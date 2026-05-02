/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runWorkflowWithFailureLog } from "./workflow-failure-log";

describe("runWorkflowWithFailureLog", () => {
  test("logs a structured failure record before rethrowing", async () => {
    const originalConsoleError = console.error;
    const logs: unknown[] = [];
    console.error = (...args: unknown[]) => {
      logs.push(args[0]);
    };

    try {
      await expect(
        runWorkflowWithFailureLog({
          entrypoint: "TestWorkflow",
          instanceId: "workflow-1",
          run: () => {
            throw new Error("boom");
          },
          workflowName: "skills-re-v1-test-workflow",
        }),
      ).rejects.toThrow("boom");
    } finally {
      console.error = originalConsoleError;
    }

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      component: "workflow",
      entrypoint: "TestWorkflow",
      error: {
        message: "boom",
        name: "Error",
      },
      event: "workflow.failed",
      instanceId: "workflow-1",
      level: "error",
      workflowName: "skills-re-v1-test-workflow",
    });
  });
});
