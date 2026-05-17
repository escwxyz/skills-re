import type { Sandbox } from "@cloudflare/sandbox";

export interface SkillEvalSandboxRuntimeEnv {
  SKILL_EVAL_SANDBOX_ENABLED?: string;
  SKILL_EVAL_OPENCODE_API_KEY?: string;
  SKILL_EVAL_OPENCODE_MODEL?: string;
  SKILL_EVAL_SANDBOX: DurableObjectNamespace<Sandbox>;
}

export interface SkillEvalSandboxHandle {
  destroy(): Promise<void>;
  setEnvVars(vars: Record<string, string | undefined>): Promise<void>;
}

interface SkillEvalSandboxRuntimeDeps {
  getSandbox: (
    namespace: DurableObjectNamespace<Sandbox>,
    id: string,
    options: { normalizeId: true },
  ) => SkillEvalSandboxHandle;
}

const getDefaultDeps = async (): Promise<SkillEvalSandboxRuntimeDeps> => {
  const { getSandbox } = await import("@cloudflare/sandbox");
  return {
    getSandbox,
  };
};

export const createSkillEvalSandboxId = (runId: string) => {
  const normalized = runId
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 48);

  return `skill-eval-${normalized || "run"}`;
};

export const createSkillEvalAgentEnvVars = (env: SkillEvalSandboxRuntimeEnv) => ({
  OPENCODE_API_KEY: env.SKILL_EVAL_OPENCODE_API_KEY?.trim() || undefined,
  OPENCODE_MODEL: env.SKILL_EVAL_OPENCODE_MODEL?.trim() || undefined,
  SKILLS_RE_EVAL_AGENT: "opencode",
});

export const isSkillEvalSandboxEnabled = (
  env: Pick<SkillEvalSandboxRuntimeEnv, "SKILL_EVAL_SANDBOX_ENABLED">,
) => ["1", "true", "yes"].includes(env.SKILL_EVAL_SANDBOX_ENABLED?.trim().toLowerCase() ?? "");

export const createSkillEvalSandboxRuntime = (
  env: SkillEvalSandboxRuntimeEnv,
  deps?: SkillEvalSandboxRuntimeDeps,
) => {
  const getSandboxForRun = async (runId: string) => {
    const activeDeps = deps ?? (await getDefaultDeps());
    return activeDeps.getSandbox(env.SKILL_EVAL_SANDBOX, createSkillEvalSandboxId(runId), {
      normalizeId: true,
    });
  };

  return {
    async destroyRunSandbox(runId: string) {
      const handle = await getSandboxForRun(runId);
      await handle.destroy();
    },

    getSandboxForRun,

    async injectAgentCredentials(sandbox: SkillEvalSandboxHandle) {
      await sandbox.setEnvVars(createSkillEvalAgentEnvVars(env));
    },
  };
};
