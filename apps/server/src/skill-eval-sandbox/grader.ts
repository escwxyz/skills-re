// oxlint-disable no-nested-ternary
export type EvalCaseGradeStatus = "blocked" | "fail" | "pass";

export interface EvalGradeArtifact {
  key: string;
  label?: string;
}

export interface EvalAgentRunResult {
  artifacts?: EvalGradeArtifact[];
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  exitCode?: number;
  stderr?: string;
  stdout?: string;
  success?: boolean;
}

export interface EvalCaseGradeInput {
  assertions?: string[];
  baseline?: EvalAgentRunResult | null;
  caseId: string;
  expectedFilePaths?: string[];
  expectedOutput?: string;
  withSkill: EvalAgentRunResult;
}

export interface EvalGradeCriterion {
  details?: string;
  id: string;
  label: string;
  required: boolean;
  status: "fail" | "needs_review" | "pass" | "skipped";
}

export interface EvalModeGrade {
  criteria: EvalGradeCriterion[];
  score: number;
  status: EvalCaseGradeStatus;
}

const normalizeText = (value: string) => value.trim().replaceAll(/\s+/g, " ").toLowerCase();

const normalizePath = (value: string) => value.replace(/^\.?\//, "").trim();

const isCommandSuccess = (result: EvalAgentRunResult) =>
  result.success !== false && (result.exitCode ?? 0) === 0;

const isPolicyBlock = (result: EvalAgentRunResult) => {
  const code = result.errorCode?.toLowerCase() ?? "";
  return (
    code.includes("policy") ||
    code.includes("blocked") ||
    code.includes("network_denied") ||
    code.includes("disallowed")
  );
};

const hasExpectedArtifact = (result: EvalAgentRunResult, expectedPath: string) => {
  const normalizedExpected = normalizePath(expectedPath);
  return (result.artifacts ?? []).some((artifact) => {
    const key = normalizePath(artifact.key);
    const label = artifact.label ? normalizePath(artifact.label) : "";
    return (
      key === normalizedExpected ||
      key.endsWith(`/${normalizedExpected}`) ||
      label === normalizedExpected
    );
  });
};

export const gradeEvalModeResult = (input: {
  assertions?: string[];
  expectedFilePaths?: string[];
  expectedOutput?: string;
  result: EvalAgentRunResult;
}): EvalModeGrade => {
  const output = input.result.stdout ?? "";
  const expectedFilePaths = input.expectedFilePaths ?? [];
  const requiredCriteria: EvalGradeCriterion[] = [
    {
      id: "command_success",
      label: "Command completed successfully",
      required: true,
      status: isCommandSuccess(input.result) ? "pass" : "fail",
    },
    {
      id: "non_empty_output",
      label: "Agent produced stdout",
      required: true,
      status: output.trim().length > 0 ? "pass" : "fail",
    },
  ];

  const fileCriteria = expectedFilePaths.map((expectedPath): EvalGradeCriterion => {
    const found = hasExpectedArtifact(input.result, expectedPath);
    return {
      details: expectedPath,
      id: `expected_file:${expectedPath}`,
      label: "Expected file artifact exists",
      required: true,
      status: found ? "pass" : "fail",
    };
  });

  const expectedOutputCriterion: EvalGradeCriterion | null = input.expectedOutput
    ? {
        details: input.expectedOutput,
        id: "expected_output_text",
        label: "Expected output text appears in stdout",
        required: false,
        status: normalizeText(output).includes(normalizeText(input.expectedOutput))
          ? "pass"
          : "needs_review",
      }
    : null;

  const assertionsCriterion: EvalGradeCriterion | null =
    input.assertions && input.assertions.length > 0
      ? {
          details: input.assertions.join(" | "),
          id: "assertion_metadata",
          label: "Assertion metadata captured for review",
          required: false,
          status: "needs_review",
        }
      : null;

  const criteria = [
    ...requiredCriteria,
    ...fileCriteria,
    ...(expectedOutputCriterion ? [expectedOutputCriterion] : []),
    ...(assertionsCriterion ? [assertionsCriterion] : []),
  ];
  const blockingCriteria = criteria.filter((criterion) => criterion.required);
  const passedRequiredCount = blockingCriteria.filter(
    (criterion) => criterion.status === "pass",
  ).length;
  const score =
    blockingCriteria.length === 0
      ? 1
      : Number((passedRequiredCount / blockingCriteria.length).toFixed(4));
  const status = isPolicyBlock(input.result)
    ? "blocked"
    : passedRequiredCount === blockingCriteria.length
      ? "pass"
      : "fail";

  return {
    criteria,
    score,
    status,
  };
};

export const summarizeBaselineComparison = (input: {
  baseline?: EvalModeGrade | null;
  withSkill: EvalModeGrade;
}) => {
  if (!input.baseline) {
    return {
      outcome: "not_run" as const,
      summary: "Baseline mode was not run.",
    };
  }

  if (input.withSkill.status === input.baseline.status) {
    return {
      outcome: "same_status" as const,
      summary: `With-skill and baseline both ended with ${input.withSkill.status}.`,
    };
  }

  if (input.withSkill.status === "pass") {
    return {
      outcome: "with_skill_better" as const,
      summary: `With-skill passed while baseline ended with ${input.baseline.status}.`,
    };
  }

  if (input.baseline.status === "pass") {
    return {
      outcome: "baseline_better" as const,
      summary: `Baseline passed while with-skill ended with ${input.withSkill.status}.`,
    };
  }

  return {
    outcome: "different_failure" as const,
    summary: `With-skill ended with ${input.withSkill.status}; baseline ended with ${input.baseline.status}.`,
  };
};

export const gradeEvalCaseResult = (input: EvalCaseGradeInput) => {
  const withSkill = gradeEvalModeResult({
    assertions: input.assertions,
    expectedFilePaths: input.expectedFilePaths,
    expectedOutput: input.expectedOutput,
    result: input.withSkill,
  });
  const baseline = input.baseline
    ? gradeEvalModeResult({
        assertions: input.assertions,
        expectedFilePaths: input.expectedFilePaths,
        expectedOutput: input.expectedOutput,
        result: input.baseline,
      })
    : null;
  const baselineComparison = summarizeBaselineComparison({ baseline, withSkill });
  const status =
    withSkill.status === "blocked" || baseline?.status === "blocked"
      ? "blocked"
      : withSkill.status === "pass"
        ? "pass"
        : "fail";

  return {
    assertionSummary: {
      assertions: input.assertions ?? [],
      baselineComparison,
      expectedFilePaths: input.expectedFilePaths ?? [],
      expectedOutput: input.expectedOutput ?? null,
      withSkillCriteria: withSkill.criteria,
      ...(baseline ? { baselineCriteria: baseline.criteria } : {}),
    },
    baseline,
    caseId: input.caseId,
    status,
    summary: baselineComparison.summary,
    withSkill,
  };
};

export const aggregateEvalCaseGrades = (
  cases: {
    status: EvalCaseGradeStatus;
  }[],
) => {
  const summary = {
    blockedCases: 0,
    failedCases: 0,
    passedCases: 0,
    totalCases: 0,
  };

  for (const caseItem of cases) {
    if (caseItem.status === "pass") {
      summary.passedCases += 1;
    } else if (caseItem.status === "blocked") {
      summary.blockedCases += 1;
    } else {
      summary.failedCases += 1;
    }
    summary.totalCases += 1;
  }

  const status = summary.blockedCases > 0 ? "blocked" : summary.failedCases > 0 ? "fail" : "pass";

  return {
    status,
    summary,
  };
};
