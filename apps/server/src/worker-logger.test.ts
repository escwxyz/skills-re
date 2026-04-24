/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createWorkerLogger } from "./worker-logger";

describe("createWorkerLogger", () => {
  test("preserves chained error causes in structured output", () => {
    const originalConsoleError = console.error;
    const logs: unknown[] = [];
    console.error = (...args: unknown[]) => {
      logs.push(args[0]);
    };

    try {
      const logger = createWorkerLogger({ component: "test" });
      const rootCause = new Error("root cause");
      const error = new Error("top level", { cause: rootCause });

      logger.error("test.error", {
        error,
      });
    } finally {
      console.error = originalConsoleError;
    }

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      component: "test",
      error: {
        cause: {
          message: "root cause",
          name: "Error",
        },
        message: "top level",
        name: "Error",
      },
      event: "test.error",
      level: "error",
    });
  });
});
