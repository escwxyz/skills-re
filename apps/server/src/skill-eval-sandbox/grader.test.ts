/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  aggregateEvalCaseGrades,
  gradeEvalCaseResult,
  gradeEvalModeResult,
  summarizeBaselineComparison,
} from "./grader";

describe("skill eval deterministic grader", () => {
  test("passes a successful mode with non-empty output and expected file evidence", () => {
    const grade = gradeEvalModeResult({
      expectedFilePaths: [".skills-re/output/report.md"],
      expectedOutput: "Summary",
      result: {
        artifacts: [{ key: "eval-runs/run-1/cases/case-1/with_skill/.skills-re/output/report.md" }],
        exitCode: 0,
        stdout: "Summary generated.",
        success: true,
      },
    });

    expect(grade.status).toBe("pass");
    expect(grade.score).toBe(1);
    expect(grade.criteria.map((criterion) => [criterion.id, criterion.status])).toContainEqual([
      "expected_output_text",
      "pass",
    ]);
  });

  test("fails when stdout is empty even if the command exits cleanly", () => {
    const grade = gradeEvalModeResult({
      result: {
        exitCode: 0,
        stdout: "   ",
        success: true,
      },
    });

    expect(grade.status).toBe("fail");
    expect(grade.criteria.find((criterion) => criterion.id === "non_empty_output")?.status).toBe(
      "fail",
    );
  });

  test("records assertion metadata without treating it as an automated pass", () => {
    const grade = gradeEvalModeResult({
      assertions: ["mentions the boundary condition"],
      expectedOutput: "Explains the boundary condition",
      result: {
        exitCode: 0,
        stdout: "The result describes a likely edge case.",
        success: true,
      },
    });

    expect(grade.status).toBe("pass");
    expect(grade.criteria.find((criterion) => criterion.id === "assertion_metadata")?.status).toBe(
      "needs_review",
    );
    expect(
      grade.criteria.find((criterion) => criterion.id === "expected_output_text")?.status,
    ).toBe("needs_review");
  });

  test("marks policy errors as blocked", () => {
    const grade = gradeEvalModeResult({
      result: {
        errorCode: "network_denied",
        exitCode: 1,
        stderr: "network blocked",
        stdout: "",
        success: false,
      },
    });

    expect(grade.status).toBe("blocked");
  });

  test("summarizes baseline comparison for case results", () => {
    const graded = gradeEvalCaseResult({
      baseline: {
        exitCode: 1,
        stdout: "",
        success: false,
      },
      caseId: "case-1",
      withSkill: {
        exitCode: 0,
        stdout: "done",
        success: true,
      },
    });

    expect(graded.status).toBe("pass");
    expect(graded.baseline?.status).toBe("fail");
    expect(graded.assertionSummary.baselineComparison.outcome).toBe("with_skill_better");
  });

  test("reports omitted baseline mode explicitly", () => {
    expect(
      summarizeBaselineComparison({
        baseline: null,
        withSkill: { criteria: [], score: 1, status: "pass" },
      }),
    ).toEqual({
      outcome: "not_run",
      summary: "Baseline mode was not run.",
    });
  });

  test("aggregates case grades into a run-level summary", () => {
    expect(
      aggregateEvalCaseGrades([
        { status: "pass" },
        { status: "fail" },
        { status: "blocked" },
        { status: "pass" },
      ]),
    ).toEqual({
      status: "blocked",
      summary: {
        blockedCases: 1,
        failedCases: 1,
        passedCases: 2,
        totalCases: 4,
      },
    });

    expect(aggregateEvalCaseGrades([{ status: "pass" }])).toEqual({
      status: "pass",
      summary: {
        blockedCases: 0,
        failedCases: 0,
        passedCases: 1,
        totalCases: 1,
      },
    });
  });
});
