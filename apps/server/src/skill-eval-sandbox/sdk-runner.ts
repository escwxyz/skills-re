export const AGENT_SKILLS_EVAL_PACKAGE_VERSION = "0.1.1";

export const DEFAULT_AGENT_SKILLS_EVAL_RUNNER_PATH =
  "/usr/local/bin/skills-re-agent-skills-eval-runner.mjs";

export type AgentSkillsEvalSdkProviderConfig =
  | {
      apiKeyEnv: string;
      baseUrl: string;
      extraHeaders?: Record<string, string>;
      maxTokens?: number;
      model: string;
      providerName: string;
      retry?: {
        attempts?: number;
        backoffMs?: number;
      };
      temperature?: number;
      timeoutMs?: number;
      type: "openai-compatible";
    }
  | {
      args: string[];
      command: string;
      cwd?: string;
      env?: Record<string, string>;
      model: string;
      providerName: string;
      type: "cli";
      workspaceDir?: string;
    };

export interface AgentSkillsEvalRunnerConfig {
  baseline: boolean;
  concurrency: number;
  eventsPath: string;
  exclude?: string[];
  include?: string[];
  judge: AgentSkillsEvalSdkProviderConfig;
  judgeParams?: Record<string, unknown>;
  report: boolean;
  reportOutput: string;
  reportTitle: string;
  root: string;
  runId: string;
  strict: boolean;
  summaryPath: string;
  target: AgentSkillsEvalSdkProviderConfig;
  targetParams?: Record<string, unknown>;
  workspace: string;
  workspaceLayout: "flat" | "iteration";
}

export interface AgentSkillsEvalRunnerConfigSandbox {
  mkdir(path: string, options?: { recursive?: boolean }): Promise<unknown>;
  writeFile(path: string, content: string): Promise<unknown>;
}

const trimSlash = (value: string) => value.replace(/\/+$/, "");

export const createOpenCodeSdkProviderConfig = (input: {
  model: string;
  workspaceDir?: string;
}): AgentSkillsEvalSdkProviderConfig => ({
  args: [
    "run",
    "--format",
    "json",
    "--model",
    "{{model}}",
    "--dir",
    "{{workspaceDir}}",
    "{{prompt}}",
  ],
  command: "opencode",
  model: input.model,
  providerName: "opencode",
  type: "cli",
  workspaceDir: input.workspaceDir,
});

export const createOpenAICompatibleSdkProviderConfig = (input: {
  apiKeyEnv: string;
  baseUrl: string;
  maxTokens?: number;
  model: string;
  providerName: string;
  temperature?: number;
  timeoutMs?: number;
}): AgentSkillsEvalSdkProviderConfig => ({
  apiKeyEnv: input.apiKeyEnv,
  baseUrl: input.baseUrl,
  maxTokens: input.maxTokens,
  model: input.model,
  providerName: input.providerName,
  temperature: input.temperature,
  timeoutMs: input.timeoutMs,
  type: "openai-compatible",
});

export const createAgentSkillsEvalRunnerConfig = (input: {
  baseline?: boolean;
  concurrency?: number;
  include?: string[];
  judge: AgentSkillsEvalSdkProviderConfig;
  report?: boolean;
  reportTitle?: string;
  root?: string;
  runId: string;
  strict?: boolean;
  target: AgentSkillsEvalSdkProviderConfig;
  workspaceDir?: string;
  workspaceLayout?: "flat" | "iteration";
}): AgentSkillsEvalRunnerConfig => {
  const root = trimSlash(input.root ?? "/workspace");
  const skillsReDir = `${root}/.skills-re`;
  const workspace = trimSlash(input.workspaceDir ?? `${skillsReDir}/agent-skills-workspace`);
  return {
    baseline: input.baseline ?? false,
    concurrency: input.concurrency ?? 1,
    eventsPath: `${skillsReDir}/agent-skills-eval-events.jsonl`,
    include: input.include,
    judge: input.judge,
    report: input.report ?? true,
    reportOutput: `${workspace}/report`,
    reportTitle: input.reportTitle ?? "Skills.re Eval Report",
    root,
    runId: input.runId,
    strict: input.strict ?? true,
    summaryPath: `${skillsReDir}/agent-skills-eval-summary.json`,
    target: input.target,
    workspace,
    workspaceLayout: input.workspaceLayout ?? "iteration",
  };
};

export async function writeAgentSkillsEvalRunnerConfig(input: {
  config: AgentSkillsEvalRunnerConfig;
  configPath?: string;
  sandbox: AgentSkillsEvalRunnerConfigSandbox;
}) {
  const configPath = input.configPath ?? `${input.config.root}/.skills-re/agent-skills-eval.json`;
  const parent = configPath.slice(0, configPath.lastIndexOf("/"));
  await input.sandbox.mkdir(parent, { recursive: true });
  await input.sandbox.writeFile(configPath, JSON.stringify(input.config, null, 2));
  return { configPath };
}

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

export const buildAgentSkillsEvalRunnerCommand = (input: {
  configPath: string;
  runnerPath?: string;
}) => {
  const runnerPath = input.runnerPath ?? DEFAULT_AGENT_SKILLS_EVAL_RUNNER_PATH;
  return ["node", shellQuote(runnerPath), "--config", shellQuote(input.configPath)].join(" ");
};
