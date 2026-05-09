/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  DEV_TEST_USER_ID,
  createDevTestSession,
  createDevTestSessionResponse,
  resolveDevTestSession,
  resolveDevTestSessionResponse,
} from "./dev-session";
import { resolveDevTestUserEnabled } from "@skills-re/env/dev";

describe("dev test session", () => {
  test("creates the canonical local test user session", () => {
    const session = createDevTestSession();

    expect(session.user.id).toBe(DEV_TEST_USER_ID);
    expect(session.user.email).toBe("test@skills.re");
    expect(session.user.role).toBe("admin");
    expect(session.session.userId).toBe(DEV_TEST_USER_ID);
  });

  test("prefers a real session over the dev fallback", () => {
    const realSession = {
      session: {
        expiresAt: new Date("2030-01-01"),
        id: "real-session",
        userId: "real-user",
      },
      user: {
        email: "real@skills.re",
        id: "real-user",
        image: null,
        name: "Real User",
        role: "member",
      },
    } as const;

    expect(resolveDevTestSession(realSession, true)).toBe(realSession);
  });

  test("returns the dev session when enabled and no real session exists", () => {
    const session = resolveDevTestSession(null, true);

    expect(session?.user.id).toBe(DEV_TEST_USER_ID);
  });

  test("returns null when disabled and no real session exists", () => {
    expect(resolveDevTestSession(null, false)).toBeNull();
  });

  test("creates the wrapper session response used by Start middleware", () => {
    const response = createDevTestSessionResponse();

    expect(response.data.user.id).toBe(DEV_TEST_USER_ID);
    expect(response.error).toBeNull();
  });

  test("prefers a real session response over the dev fallback", () => {
    const realResponse = {
      data: {
        session: {
          expiresAt: new Date("2031-01-01"),
          id: "real-session-response",
          userId: "real-user",
        },
        user: {
          email: "real@skills.re",
          id: "real-user",
          image: null,
          name: "Real User",
          role: "member",
        },
      },
      error: null,
    } as const;

    expect(resolveDevTestSessionResponse(realResponse, true)).toBe(realResponse);
  });

  test("never enables the dev user in production regardless of config", () => {
    expect(resolveDevTestUserEnabled({ isProduction: true, configuredValue: "true" })).toBe(false);
    expect(resolveDevTestUserEnabled({ isProduction: true, configuredValue: undefined })).toBe(
      false,
    );
  });

  test("defaults to enabled in local development unless explicitly disabled", () => {
    expect(resolveDevTestUserEnabled({ isProduction: false, configuredValue: undefined })).toBe(
      true,
    );
    expect(resolveDevTestUserEnabled({ isProduction: false, configuredValue: "false" })).toBe(
      false,
    );
  });
});
