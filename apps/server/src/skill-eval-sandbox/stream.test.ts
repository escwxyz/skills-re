/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { authorizeSkillEvalEventReplayRequest, authorizeSkillEvalStreamRequest } from "./stream";
import type { SkillEvalStreamDeps } from "./stream";

const createRequest = (headers: HeadersInit = {}) =>
  new Request("https://server.test/skill-eval-sandbox/runs/run-1/stream", {
    headers,
  });

const createDeps = (overrides: Partial<SkillEvalStreamDeps> = {}): SkillEvalStreamDeps => ({
  authorizeRun: () => Promise.resolve("authorized"),
  getSession: () =>
    Promise.resolve({
      user: {
        id: "user-1",
      },
    }),
  ...overrides,
});

describe("skill eval stream authorization", () => {
  test("requires the feature flag and websocket upgrade", async () => {
    await expect(
      authorizeSkillEvalStreamRequest({
        deps: createDeps(),
        env: { SKILL_EVAL_SANDBOX_ENABLED: "false" },
        request: createRequest({ upgrade: "websocket" }),
        runId: "run-1",
      }),
    ).resolves.toMatchObject({
      error: "skill-eval-sandbox-disabled",
      ok: false,
      status: 404,
    });

    await expect(
      authorizeSkillEvalStreamRequest({
        deps: createDeps(),
        env: { SKILL_EVAL_SANDBOX_ENABLED: "true" },
        request: createRequest(),
        runId: "run-1",
      }),
    ).resolves.toMatchObject({
      error: "websocket-upgrade-required",
      ok: false,
      status: 426,
    });
  });

  test("requires an authenticated session", async () => {
    await expect(
      authorizeSkillEvalStreamRequest({
        deps: createDeps({
          getSession: () => Promise.resolve(null),
        }),
        env: { SKILL_EVAL_SANDBOX_ENABLED: "true" },
        request: createRequest({ upgrade: "websocket" }),
        runId: "run-1",
      }),
    ).resolves.toMatchObject({
      error: "unauthorized",
      ok: false,
      status: 401,
    });
  });

  test("authorizes the requested run for the current user", async () => {
    const authorizations: unknown[] = [];
    await expect(
      authorizeSkillEvalStreamRequest({
        deps: createDeps({
          authorizeRun: (input) => {
            authorizations.push(input);
            return Promise.resolve("authorized");
          },
        }),
        env: { SKILL_EVAL_SANDBOX_ENABLED: "true" },
        request: createRequest({ upgrade: "websocket" }),
        runId: "run-1",
      }),
    ).resolves.toEqual({
      ok: true,
      userId: "user-1",
    });

    expect(authorizations).toEqual([{ runId: "run-1", userId: "user-1" }]);
  });

  test("allows authorized event replay without websocket upgrade", async () => {
    await expect(
      authorizeSkillEvalEventReplayRequest({
        deps: createDeps(),
        env: { SKILL_EVAL_SANDBOX_ENABLED: "true" },
        request: createRequest(),
        runId: "run-1",
      }),
    ).resolves.toEqual({
      ok: true,
      userId: "user-1",
    });
  });

  test("maps run-level authorization failures to safe responses", async () => {
    await expect(
      authorizeSkillEvalStreamRequest({
        deps: createDeps({
          authorizeRun: () => Promise.resolve("forbidden"),
        }),
        env: { SKILL_EVAL_SANDBOX_ENABLED: "true" },
        request: createRequest({ upgrade: "websocket" }),
        runId: "run-1",
      }),
    ).resolves.toMatchObject({
      error: "forbidden",
      ok: false,
      status: 403,
    });

    await expect(
      authorizeSkillEvalStreamRequest({
        deps: createDeps({
          authorizeRun: () => Promise.resolve("not_found"),
        }),
        env: { SKILL_EVAL_SANDBOX_ENABLED: "true" },
        request: createRequest({ upgrade: "websocket" }),
        runId: "run-1",
      }),
    ).resolves.toMatchObject({
      error: "run-not-found",
      ok: false,
      status: 404,
    });
  });
});
