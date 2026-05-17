/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { AUTOMATION_TOKEN_HEADER } from "../lib/automation-token";
import { createSkillEvalSandboxSmokeResponse } from "./smoke";
import type { SkillEvalR2Bucket } from "./event-writer";

const createBucket = () => {
  const objects = new Map<string, string>();
  const bucket: SkillEvalR2Bucket = {
    get: (key) => {
      const value = objects.get(key);
      return Promise.resolve(value ? { text: () => Promise.resolve(value) } : null);
    },
    put: (key, value) => {
      if (typeof value !== "string") {
        throw new Error("fake bucket only accepts string values");
      }
      objects.set(key, value);
      return Promise.resolve();
    },
  };
  return { bucket, objects };
};

const createEnv = (bucket: SkillEvalR2Bucket) =>
  ({
    AUTOMATION_API_TOKEN: "secret",
    SKILL_EVAL_ARTIFACTS: bucket,
    SKILL_EVAL_OPENCODE_MODEL: "opencode-model",
    SKILL_EVAL_SANDBOX: {} as DurableObjectNamespace<never>,
    SKILL_EVAL_SANDBOX_ENABLED: "true",
  }) as unknown as Parameters<typeof createSkillEvalSandboxSmokeResponse>[1];

describe("skill eval sandbox smoke route", () => {
  test("requires the automation token", async () => {
    const { bucket } = createBucket();
    const response = await createSkillEvalSandboxSmokeResponse(
      new Request("https://server.test/skill-eval-sandbox/smoke", { method: "POST" }),
      createEnv(bucket),
    );

    expect(response.status).toBe(401);
  });

  test("verifies binding, workspace write, command, R2 event, and cleanup", async () => {
    const { bucket, objects } = createBucket();
    const calls: string[] = [];
    const response = await createSkillEvalSandboxSmokeResponse(
      new Request("https://server.test/skill-eval-sandbox/smoke", {
        headers: { [AUTOMATION_TOKEN_HEADER]: "secret" },
        method: "POST",
      }),
      createEnv(bucket),
      {
        getSandboxForRun: (_env, runId) => {
          calls.push(`get:${runId}`);
          return Promise.resolve({
            destroy: () => {
              calls.push("destroy");
              return Promise.resolve();
            },
            exec: (command) => {
              calls.push(`exec:${command}`);
              return Promise.resolve({ stdout: "skills-re-sandbox-smoke\n", success: true });
            },
            mkdir: (path) => {
              calls.push(`mkdir:${path}`);
              return Promise.resolve();
            },
            setEnvVars: () => {
              calls.push("env");
              return Promise.resolve();
            },
            writeFile: (path) => {
              calls.push(`write:${path}`);
              return Promise.resolve();
            },
          });
        },
        now: () => 123,
      },
    );

    await expect(response.json()).resolves.toMatchObject({
      checks: {
        bindingStarted: true,
        commandExecuted: true,
        r2EventWritten: true,
        runnerConfigWritten: true,
        workspaceWritten: true,
      },
      ok: true,
      runId: "smoke-123",
    });
    expect(calls).toContain("destroy");
    expect(objects.get("eval-runs/smoke-123/events.jsonl")).toContain(
      "Sandbox smoke check completed.",
    );
  });
});
