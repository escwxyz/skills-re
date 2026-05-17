/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  createSkillEvalAgentEnvVars,
  createSkillEvalSandboxId,
  createSkillEvalSandboxRuntime,
  isSkillEvalSandboxEnabled,
  type SkillEvalSandboxHandle,
  type SkillEvalSandboxRuntimeEnv,
} from "./runtime";

const createEnv = (overrides: Partial<SkillEvalSandboxRuntimeEnv> = {}) =>
  ({
    SKILL_EVAL_OPENCODE_API_KEY: "opencode-key",
    SKILL_EVAL_OPENCODE_MODEL: "anthropic/claude-sonnet-4-5",
    SKILL_EVAL_SANDBOX_ENABLED: "true",
    SKILL_EVAL_SANDBOX: {} as DurableObjectNamespace<never>,
    ...overrides,
  }) as SkillEvalSandboxRuntimeEnv;

describe("skill eval sandbox runtime", () => {
  test("creates deterministic sandbox ids from run ids", () => {
    expect(createSkillEvalSandboxId("Run_ABC.123")).toBe("skill-eval-run-abc-123");
    expect(createSkillEvalSandboxId("   ")).toBe("skill-eval-run");
  });

  test("gets sandbox stubs with normalized ids", async () => {
    const calls: unknown[] = [];
    const sandbox: SkillEvalSandboxHandle = {
      destroy: () => Promise.resolve(),
      setEnvVars: () => Promise.resolve(),
    };
    const env = createEnv();
    const runtime = createSkillEvalSandboxRuntime(env, {
      getSandbox: (namespace, id, options) => {
        calls.push({ id, namespace, options });
        return sandbox;
      },
    });

    await expect(runtime.getSandboxForRun("Run_ABC.123")).resolves.toBe(sandbox);
    expect(calls).toEqual([
      {
        id: "skill-eval-run-abc-123",
        namespace: env.SKILL_EVAL_SANDBOX,
        options: { normalizeId: true },
      },
    ]);
  });

  test("injects only server-owned agent credentials into the sandbox", async () => {
    const vars: unknown[] = [];
    const runtime = createSkillEvalSandboxRuntime(createEnv(), {
      getSandbox: () => {
        throw new Error("not used");
      },
    });

    await runtime.injectAgentCredentials({
      destroy: () => Promise.resolve(),
      setEnvVars: (input) => {
        vars.push(input);
        return Promise.resolve();
      },
    });

    expect(vars).toEqual([
      {
        OPENCODE_API_KEY: "opencode-key",
        OPENCODE_MODEL: "anthropic/claude-sonnet-4-5",
        SKILLS_RE_EVAL_AGENT: "opencode",
      },
    ]);
  });

  test("clears missing optional agent credentials", () => {
    expect(
      createSkillEvalAgentEnvVars(
        createEnv({
          SKILL_EVAL_OPENCODE_API_KEY: "",
          SKILL_EVAL_OPENCODE_MODEL: "",
        }),
      ),
    ).toEqual({
      OPENCODE_API_KEY: undefined,
      OPENCODE_MODEL: undefined,
      SKILLS_RE_EVAL_AGENT: "opencode",
    });
  });

  test("destroys a run sandbox by deterministic run id", async () => {
    const destroyed: string[] = [];
    const runtime = createSkillEvalSandboxRuntime(createEnv(), {
      getSandbox: (_namespace, id) => ({
        destroy: () => {
          destroyed.push(id);
          return Promise.resolve();
        },
        setEnvVars: () => Promise.resolve(),
      }),
    });

    await runtime.destroyRunSandbox("run-1");
    expect(destroyed).toEqual(["skill-eval-run-1"]);
  });

  test("parses the sandbox feature flag conservatively", () => {
    expect(isSkillEvalSandboxEnabled({ SKILL_EVAL_SANDBOX_ENABLED: "true" })).toBe(true);
    expect(isSkillEvalSandboxEnabled({ SKILL_EVAL_SANDBOX_ENABLED: "1" })).toBe(true);
    expect(isSkillEvalSandboxEnabled({ SKILL_EVAL_SANDBOX_ENABLED: "false" })).toBe(false);
    expect(isSkillEvalSandboxEnabled({})).toBe(false);
  });
});
