/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SkillEvalRunDetailPanel } from "./skill-eval-run-detail-panel";

const detail = {
  agent: {
    displayName: "OpenCode",
    provider: "opencode",
  },
  artifactPrefix: "eval-runs/run-1",
  caseResults: [
    {
      artifacts: [{ key: "eval-runs/run-1/cases/case-1/output.txt", label: "output.txt" }],
      baseline: {
        durationMs: 200,
        exitCode: 1,
        outputPreview: "baseline output",
        score: 0.5,
        status: "fail",
      },
      caseId: "case-1",
      status: "pass",
      summary: "with skill passed",
      withSkill: {
        durationMs: 100,
        exitCode: 0,
        outputPreview: "with skill output",
        score: 1,
        status: "pass",
      },
    },
  ],
  completedAt: 2,
  id: "run-1",
  status: "pass",
  summary: {
    blockedCases: 0,
    failedCases: 0,
    passedCases: 1,
    totalCases: 1,
  },
  totalDurationMs: 300,
};

describe("SkillEvalRunDetailPanel", () => {
  test("renders run detail, mode results, artifacts, and timing", () => {
    const markup = renderToStaticMarkup(<SkillEvalRunDetailPanel detail={detail} />);

    expect(markup).toContain("run-1");
    expect(markup).toContain("with skill output");
    expect(markup).toContain("baseline output");
    expect(markup).toContain("output.txt");
    expect(markup).toContain("300ms");
  });
});
