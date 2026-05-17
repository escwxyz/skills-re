import type { EvaluateSkillsResult, SkillsEvent } from "agent-skills-eval";

export type AgentSkillsEvalSdkCaseStatus = "fail" | "pass";
export type AgentSkillsEvalSdkRunStatus = "fail" | "pass";

export interface AgentSkillsEvalSdkRunnerSummary {
  result: EvaluateSkillsResult;
  status?: AgentSkillsEvalSdkRunStatus;
  summary?: {
    blockedCases: number;
    failedCases: number;
    passedCases: number;
    totalCases: number;
  };
}

export const summarizeAgentSkillsEvalSdkResult = (
  result: EvaluateSkillsResult,
): Required<AgentSkillsEvalSdkRunnerSummary>["summary"] => ({
  blockedCases: 0,
  failedCases: result.failed,
  passedCases: result.passed,
  totalCases: result.failed + result.passed,
});

export const getAgentSkillsEvalSdkRunStatus = (
  summary: Pick<Required<AgentSkillsEvalSdkRunnerSummary>["summary"], "failedCases">,
): AgentSkillsEvalSdkRunStatus => (summary.failedCases > 0 ? "fail" : "pass");

const getCaseKey = (event: Extract<SkillsEvent, { type: "eval-end" }>) =>
  String(event.evalId ?? event.evalSlug);

const getModeKey = (mode: "with_skill" | "without_skill") =>
  mode === "without_skill" ? "baseline" : "withSkill";

export interface AgentSkillsEvalSdkCaseResultSummary {
  baseline?: {
    durationMs: number;
    outputPreview: string;
    score: number;
    status: AgentSkillsEvalSdkCaseStatus;
    tokenCount: number;
  };
  caseId: string;
  status: AgentSkillsEvalSdkCaseStatus;
  summary: string;
  withSkill?: {
    durationMs: number;
    outputPreview: string;
    score: number;
    status: AgentSkillsEvalSdkCaseStatus;
    tokenCount: number;
  };
}

const toModeResult = (event: Extract<SkillsEvent, { type: "eval-end" }>) => ({
  durationMs: event.timing.duration_ms,
  outputPreview: event.output.length > 4000 ? `${event.output.slice(0, 4000)}...` : event.output,
  score: event.grading.summary.pass_rate,
  status: event.grading.summary.failed > 0 ? ("fail" as const) : ("pass" as const),
  tokenCount: event.timing.total_tokens,
});

export const createAgentSkillsEvalSdkCaseResultSummaries = (
  events: SkillsEvent[],
): AgentSkillsEvalSdkCaseResultSummary[] => {
  const cases = new Map<
    string,
    Omit<AgentSkillsEvalSdkCaseResultSummary, "status" | "summary"> & {
      baseline?: ReturnType<typeof toModeResult>;
      withSkill?: ReturnType<typeof toModeResult>;
    }
  >();

  for (const event of events) {
    if (event.type !== "eval-end") {
      continue;
    }

    const caseId = getCaseKey(event);
    const caseItem = cases.get(caseId) ?? { caseId };
    caseItem[getModeKey(event.mode)] = toModeResult(event);
    cases.set(caseId, caseItem);
  }

  return [...cases.values()].map((caseItem) => {
    const failed = caseItem.withSkill?.status === "fail" || caseItem.baseline?.status === "fail";
    const status = failed ? "fail" : "pass";
    return {
      ...caseItem,
      status,
      summary: caseItem.baseline
        ? `With-skill ${caseItem.withSkill?.status ?? "not_run"}; baseline ${caseItem.baseline.status}.`
        : `With-skill ${caseItem.withSkill?.status ?? "not_run"}.`,
    };
  });
};

export const createAgentSkillsEvalSdkArtifactPaths = (result: EvaluateSkillsResult) => {
  const artifactPaths = new Set<string>();
  for (const skill of result.skills) {
    artifactPaths.add(skill.benchmarkPath);
  }
  if (result.reportPath) {
    artifactPaths.add(result.reportPath);
  }
  return [...artifactPaths];
};
