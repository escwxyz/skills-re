/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { logHandledError } from "./logging";
import { createWorkerLogger } from "./worker-logger";

describe("logHandledError", () => {
  test("logs a normalized error payload with the provided component", () => {
    const originalConsoleError = console.error;
    const logs: unknown[] = [];
    console.error = (...args: unknown[]) => {
      logs.push(args[0]);
    };

    try {
      logHandledError({
        component: "http",
        error: "boom",
        event: "orpc.error",
      });
    } finally {
      console.error = originalConsoleError;
    }

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      component: "http",
      error: {
        message: "boom",
        name: "Error",
      },
      event: "orpc.error",
      level: "error",
    });
  });

  test("preserves object-shaped failures instead of stringifying them away", () => {
    const originalConsoleError = console.error;
    const logs: unknown[] = [];
    console.error = (...args: unknown[]) => {
      logs.push(args[0]);
    };

    try {
      const logger = createWorkerLogger({
        component: "http",
        method: "GET",
        path: "/rpc/skills.list",
        requestId: "request-1",
      });

      logHandledError({
        error: {
          message: "boom",
          reason: "bad input",
          status: 503,
        },
        event: "http.request.failed",
        logger,
      });
    } finally {
      console.error = originalConsoleError;
    }

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      component: "http",
      error: {
        cause: {
          message: "boom",
          reason: "bad input",
          status: 503,
        },
        message: "boom",
        name: "Error",
      },
      event: "http.request.failed",
      level: "error",
      method: "GET",
      path: "/rpc/skills.list",
      requestId: "request-1",
    });
  });
});
