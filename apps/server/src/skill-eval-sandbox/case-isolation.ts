import type { EvalCaseRunMode } from "./opencode-adapter";

export interface CaseIsolationSandbox {
  exec(command: string): Promise<{
    exitCode?: number;
    stderr?: string;
    success?: boolean;
  }>;
}

export interface PrepareCaseWorkspaceInput {
  caseId: string;
  mode: EvalCaseRunMode;
  sandbox: CaseIsolationSandbox;
  sourceWorkspaceDir?: string;
  workspacesRoot?: string;
}

const safeSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "") || "case";

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

const assertSuccess = (result: Awaited<ReturnType<CaseIsolationSandbox["exec"]>>) => {
  if (result.success === false || (result.exitCode !== undefined && result.exitCode !== 0)) {
    throw new Error(result.stderr?.trim() || "Failed to prepare isolated case workspace.");
  }
};

export async function prepareIsolatedCaseWorkspace(input: PrepareCaseWorkspaceInput) {
  const sourceWorkspaceDir = input.sourceWorkspaceDir ?? "/workspace";
  const workspacesRoot = input.workspacesRoot ?? "/tmp/skills-re-eval-workspaces";
  const caseWorkspaceDir = `${workspacesRoot}/${safeSegment(input.caseId)}/${input.mode}`;
  const command = [
    `rm -rf ${shellQuote(caseWorkspaceDir)}`,
    `mkdir -p ${shellQuote(caseWorkspaceDir)}`,
    `tar -C ${shellQuote(sourceWorkspaceDir)} --exclude './.skills-re/output' --exclude './.git' -cf - . | tar -C ${shellQuote(caseWorkspaceDir)} -xf -`,
  ].join(" && ");

  assertSuccess(await input.sandbox.exec(command));

  return {
    caseWorkspaceDir,
    command,
  };
}
