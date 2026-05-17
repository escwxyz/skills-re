export interface GitWorkspaceSandbox {
  exec(command: string): Promise<{
    exitCode?: number;
    stderr?: string;
    stdout?: string;
    success?: boolean;
  }>;
}

export interface PrepareGitWorkspaceInput {
  ref: string;
  repoUrl: string;
  sandbox: GitWorkspaceSandbox;
  workspaceDir?: string;
}

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

const validateApprovedRepoUrl = (repoUrl: string) => {
  const url = new URL(repoUrl);
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error("Git checkout fallback only allows HTTPS github.com repositories.");
  }
  if (url.username || url.password) {
    throw new Error("Git checkout fallback does not allow embedded credentials.");
  }
  return url.toString();
};

const assertCommandSuccess = (result: Awaited<ReturnType<GitWorkspaceSandbox["exec"]>>) => {
  if (result.success === false || (result.exitCode !== undefined && result.exitCode !== 0)) {
    throw new Error(result.stderr?.trim() || "Git checkout command failed.");
  }
};

export async function prepareApprovedGitWorkspace(input: PrepareGitWorkspaceInput) {
  const workspaceDir = input.workspaceDir ?? "/workspace";
  const repoUrl = validateApprovedRepoUrl(input.repoUrl);
  const quotedWorkspace = shellQuote(workspaceDir);
  const quotedRepo = shellQuote(repoUrl);
  const quotedRef = shellQuote(input.ref);

  for (const command of [
    `rm -rf ${quotedWorkspace} && mkdir -p ${quotedWorkspace}`,
    `git -C ${quotedWorkspace} init`,
    `git -C ${quotedWorkspace} remote add origin ${quotedRepo}`,
    `git -C ${quotedWorkspace} fetch --depth 1 origin ${quotedRef}`,
    `git -C ${quotedWorkspace} checkout --detach FETCH_HEAD`,
  ]) {
    assertCommandSuccess(await input.sandbox.exec(command));
  }

  const revParse = await input.sandbox.exec(`git -C ${quotedWorkspace} rev-parse HEAD`);
  assertCommandSuccess(revParse);

  return {
    commitSha: revParse.stdout?.trim() ?? "",
    ref: input.ref,
    repoUrl,
    source: "git" as const,
    workspaceDir,
  };
}
