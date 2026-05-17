import { verifyAutomationToken } from "../lib/automation-token";
import type { SkillEvalR2Bucket } from "./event-writer";
import { createSkillEvalR2EventWriter } from "./event-writer";
import type { SkillEvalSandboxRuntimeEnv } from "./runtime";
import { createSkillEvalSandboxRuntime } from "./runtime";
import { destroySandboxBestEffort } from "./run-control";
import {
  createAgentSkillsEvalRunnerConfig,
  createOpenAICompatibleSdkProviderConfig,
  createOpenCodeSdkProviderConfig,
  writeAgentSkillsEvalRunnerConfig,
} from "./sdk-runner";

interface SkillEvalSandboxSmokeEnv extends SkillEvalSandboxRuntimeEnv {
  AUTOMATION_API_TOKEN?: string | null;
  SKILL_EVAL_ARTIFACTS: SkillEvalR2Bucket;
}

interface SkillEvalSandboxSmokeHandle {
  destroy?(): Promise<void>;
  exec(command: string): Promise<{
    exitCode?: number;
    stderr?: string;
    stdout?: string;
    success?: boolean;
  }>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<unknown>;
  setEnvVars(vars: Record<string, string | undefined>): Promise<void>;
  writeFile(path: string, content: string): Promise<void>;
}

interface SkillEvalSandboxSmokeDeps {
  getSandboxForRun(
    env: SkillEvalSandboxSmokeEnv,
    runId: string,
  ): Promise<SkillEvalSandboxSmokeHandle>;
  now(): number;
  verifyAutomationToken: typeof verifyAutomationToken;
}

const defaultDeps: SkillEvalSandboxSmokeDeps = {
  getSandboxForRun: async (env, runId) => {
    const runtime = createSkillEvalSandboxRuntime(env);
    return (await runtime.getSandboxForRun(runId)) as unknown as SkillEvalSandboxSmokeHandle;
  },
  now: Date.now,
  verifyAutomationToken,
};

const getSmokeRunId = (now: number) => `smoke-${now}`;

export async function createSkillEvalSandboxSmokeResponse(
  request: Request,
  env: SkillEvalSandboxSmokeEnv,
  deps: Partial<SkillEvalSandboxSmokeDeps> = {},
) {
  const activeDeps = { ...defaultDeps, ...deps };
  const auth = activeDeps.verifyAutomationToken(request, env.AUTOMATION_API_TOKEN);
  if (!auth.ok) {
    return auth.response;
  }

  const runId = getSmokeRunId(activeDeps.now());
  const artifactPrefix = `eval-runs/${runId}`;
  const writer = createSkillEvalR2EventWriter({
    artifactPrefix,
    bucket: env.SKILL_EVAL_ARTIFACTS,
  });

  let sandbox: SkillEvalSandboxSmokeHandle | null = null;
  const checks: Record<string, boolean> = {
    bindingStarted: false,
    cleanupRequested: false,
    commandExecuted: false,
    r2EventWritten: false,
    runnerConfigWritten: false,
    workspaceWritten: false,
  };

  try {
    sandbox = await activeDeps.getSandboxForRun(env, runId);
    checks.bindingStarted = true;
    await sandbox.setEnvVars({
      OPENCODE_API_KEY: env.SKILL_EVAL_OPENCODE_API_KEY,
      SKILLS_RE_EVAL_AGENT: "opencode",
    });

    const smokePath = "/workspace/.skills-re/smoke.txt";
    await sandbox.writeFile(smokePath, "skills-re-sandbox-smoke\n");
    checks.workspaceWritten = true;

    const runnerConfig = createAgentSkillsEvalRunnerConfig({
      judge: createOpenAICompatibleSdkProviderConfig({
        apiKeyEnv: "OPENAI_API_KEY",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        providerName: "openai",
      }),
      runId,
      strict: false,
      target: createOpenCodeSdkProviderConfig({
        model: env.SKILL_EVAL_OPENCODE_MODEL?.trim() || "opencode-default",
      }),
    });
    await writeAgentSkillsEvalRunnerConfig({ config: runnerConfig, sandbox });
    checks.runnerConfigWritten = true;

    const commandResult = await sandbox.exec(`cat ${smokePath}`);
    checks.commandExecuted =
      commandResult.success !== false &&
      (commandResult.exitCode ?? 0) === 0 &&
      (commandResult.stdout ?? "").includes("skills-re-sandbox-smoke");
    if (!checks.commandExecuted) {
      return Response.json(
        {
          checks,
          error: "command-failed",
          message: commandResult.stderr || "Sandbox smoke command failed.",
          runId,
        },
        { status: 500 },
      );
    }

    await writer.appendEvent({
      eventId: `${runId}:1`,
      kind: "status",
      message: "Sandbox smoke check completed.",
      payload: { to: "pass" },
      runId,
      sequence: 1,
      syncTime: activeDeps.now(),
    });
    checks.r2EventWritten = true;

    return Response.json(
      {
        artifactPrefix,
        checks,
        ok: true,
        runId,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } finally {
    await destroySandboxBestEffort({
      runId,
      runtime: {
        destroyRunSandbox: async () => {
          await (sandbox?.destroy
            ? sandbox.destroy()
            : createSkillEvalSandboxRuntime(env).destroyRunSandbox(runId));
        },
      },
    });
    checks.cleanupRequested = true;
  }
}
