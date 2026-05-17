import { prepareIsolatedCaseWorkspace } from "./case-isolation";

export type EvalCaseRunMode = "baseline" | "with_skill";

export interface OpenCodeEvalCase {
  caseId: string;
  expectedOutput?: string;
  fixturePaths: string[];
  prompt: string;
}

export interface OpenCodeAdapterSandbox {
  exec(command: string): Promise<{
    exitCode?: number;
    stderr?: string;
    stdout?: string;
    success?: boolean;
  }>;
}

export interface RunOpenCodeEvalCaseInput {
  caseItem: OpenCodeEvalCase;
  mode: EvalCaseRunMode;
  model: string;
  sandbox: OpenCodeAdapterSandbox;
  workspaceDir?: string;
}

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

export const buildOpenCodeEvalPrompt = (caseItem: OpenCodeEvalCase, mode: EvalCaseRunMode) => {
  const fixtureText =
    caseItem.fixturePaths.length > 0
      ? `\nFixture files:\n${caseItem.fixturePaths.map((path) => `- ${path}`).join("\n")}`
      : "";
  const expectedText = caseItem.expectedOutput
    ? `\nExpected output or behavior:\n${caseItem.expectedOutput}`
    : "";
  const skillInstruction =
    mode === "with_skill"
      ? "Use the skill instructions available in this workspace when they are relevant."
      : "Run this as a baseline without using the skill instructions; rely only on the prompt and fixtures.";

  return [
    `Eval case: ${caseItem.caseId}`,
    skillInstruction,
    fixtureText,
    expectedText,
    `\nUser task:\n${caseItem.prompt}`,
    "\nReturn a concise final answer and write any generated files under .skills-re/output.",
  ].join("\n");
};

export const buildOpenCodeEvalCommand = (input: {
  model: string;
  prompt: string;
  workspaceDir?: string;
}) => {
  const workspaceDir = input.workspaceDir ?? "/workspace";
  return [
    "opencode run",
    "--format json",
    `--model ${shellQuote(input.model)}`,
    `--dir ${shellQuote(workspaceDir)}`,
    shellQuote(input.prompt),
  ].join(" ");
};

export async function runOpenCodeEvalCase(input: RunOpenCodeEvalCaseInput) {
  const startedAt = Date.now();
  const prompt = buildOpenCodeEvalPrompt(input.caseItem, input.mode);
  const command = buildOpenCodeEvalCommand({
    model: input.model,
    prompt,
    workspaceDir: input.workspaceDir,
  });
  const result = await input.sandbox.exec(command);
  const completedAt = Date.now();

  return {
    command,
    durationMs: completedAt - startedAt,
    exitCode: result.exitCode ?? (result.success === false ? 1 : 0),
    mode: input.mode,
    stderr: result.stderr ?? "",
    stdout: result.stdout ?? "",
    success: result.success !== false && (result.exitCode ?? 0) === 0,
  };
}

export async function runOpenCodeEvalCaseModes(input: {
  caseItem: OpenCodeEvalCase;
  includeBaseline: boolean;
  isolateWorkspaces?: boolean;
  model: string;
  sandbox: OpenCodeAdapterSandbox;
  workspacesRoot?: string;
  workspaceDir?: string;
}) {
  const isolateWorkspaces = input.isolateWorkspaces ?? true;
  const getWorkspaceDir = async (mode: EvalCaseRunMode) => {
    if (!isolateWorkspaces) {
      return input.workspaceDir;
    }

    const prepared = await prepareIsolatedCaseWorkspace({
      caseId: input.caseItem.caseId,
      mode,
      sandbox: input.sandbox,
      sourceWorkspaceDir: input.workspaceDir,
      workspacesRoot: input.workspacesRoot,
    });

    return prepared.caseWorkspaceDir;
  };

  const withSkill = await runOpenCodeEvalCase({
    caseItem: input.caseItem,
    mode: "with_skill",
    model: input.model,
    sandbox: input.sandbox,
    workspaceDir: await getWorkspaceDir("with_skill"),
  });
  const baseline = input.includeBaseline
    ? await runOpenCodeEvalCase({
        caseItem: input.caseItem,
        mode: "baseline",
        model: input.model,
        sandbox: input.sandbox,
        workspaceDir: await getWorkspaceDir("baseline"),
      })
    : null;

  return {
    baseline,
    withSkill,
  };
}
