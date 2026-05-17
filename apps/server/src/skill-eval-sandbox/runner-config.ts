export interface EvalRunnerConfigSandbox {
  mkdir(path: string, options?: { recursive?: boolean }): Promise<unknown>;
  writeFile(path: string, content: string): Promise<unknown>;
}

export interface EvalRunnerCaseConfig {
  caseId: string;
  fixturePaths: string[];
  prompt: string;
}

export interface WriteEvalRunnerConfigInput {
  agentId: string;
  cases: EvalRunnerCaseConfig[];
  includeBaseline: boolean;
  limits: unknown;
  network: unknown;
  policyVersion: string;
  runId: string;
  sandbox: EvalRunnerConfigSandbox;
  workspaceDir?: string;
}

const safeCaseDir = (caseId: string) =>
  caseId
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "") || "case";

export async function writeEvalRunnerWorkspaceConfig(input: WriteEvalRunnerConfigInput) {
  const workspaceDir = input.workspaceDir ?? "/workspace";
  const configDir = `${workspaceDir}/.skills-re`;
  const outputDir = `${configDir}/output`;
  const caseDirs = input.cases.map((caseItem) => ({
    baselineDir: `${outputDir}/cases/${safeCaseDir(caseItem.caseId)}/baseline`,
    caseId: caseItem.caseId,
    withSkillDir: `${outputDir}/cases/${safeCaseDir(caseItem.caseId)}/with_skill`,
  }));

  await input.sandbox.mkdir(configDir, { recursive: true });
  await input.sandbox.mkdir(outputDir, { recursive: true });
  for (const caseDir of caseDirs) {
    await input.sandbox.mkdir(caseDir.withSkillDir, { recursive: true });
    if (input.includeBaseline) {
      await input.sandbox.mkdir(caseDir.baselineDir, { recursive: true });
    }
  }

  const policyPath = `${configDir}/eval-policy.json`;
  const runnerConfigPath = `${configDir}/runner-config.json`;
  await input.sandbox.writeFile(
    policyPath,
    JSON.stringify(
      {
        limits: input.limits,
        network: input.network,
        policyVersion: input.policyVersion,
        runId: input.runId,
      },
      null,
      2,
    ),
  );
  await input.sandbox.writeFile(
    runnerConfigPath,
    JSON.stringify(
      {
        agentId: input.agentId,
        cases: input.cases,
        includeBaseline: input.includeBaseline,
        outputDir,
        runId: input.runId,
      },
      null,
      2,
    ),
  );

  return {
    caseDirs,
    outputDir,
    policyPath,
    runnerConfigPath,
  };
}
