/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { aggregateEvalHistoryStats, SkillEvalHistoryPanel } from "./skill-eval-history-panel";

const initialData = {
  runs: {
    continueCursor: "",
    isDone: true,
    page: [
      {
        agent: { displayName: "OpenCode" },
        completedAt: 2,
        createdAt: 1,
        id: "run-1",
        status: "pass",
        summary: {
          blockedCases: 0,
          failedCases: 0,
          passedCases: 2,
          totalCases: 2,
        },
        totalDurationMs: 1200,
      },
      {
        agent: { displayName: "OpenCode" },
        completedAt: 4,
        createdAt: 3,
        id: "run-2",
        status: "fail",
        summary: {
          blockedCases: 1,
          failedCases: 1,
          passedCases: 0,
          totalCases: 2,
        },
      },
    ],
  },
  suite: {
    caseCount: 2,
    status: "valid" as const,
  },
};

describe("SkillEvalHistoryPanel", () => {
  test("aggregates run summaries", () => {
    expect(aggregateEvalHistoryStats(initialData.runs.page)).toEqual({
      blockedCases: 1,
      failedCases: 1,
      passedCases: 2,
      totalCases: 4,
      totalRuns: 2,
    });
  });

  test("renders recent run history", () => {
    const markup = renderToStaticMarkup(
      <SkillEvalHistoryPanel
        detailHrefForRun={(runId) => `/skills/acme/repo/skill/evals/${runId}`}
        initialData={initialData}
      />,
    );

    expect(markup).toContain("run-1");
    expect(markup).toContain("/skills/acme/repo/skill/evals/run-1");
    expect(markup).toContain("OpenCode");
    expect(markup).toContain("2/2");
    expect(markup).toContain("1.2s");
  });

  test("renders an empty state for valid suites without runs", () => {
    const markup = renderToStaticMarkup(
      <SkillEvalHistoryPanel
        initialData={{
          runs: { continueCursor: "", isDone: true, page: [] },
          suite: { caseCount: 2, status: "valid" },
        }}
      />,
    );

    expect(markup).toContain("No eval runs");
    expect(markup).toContain("valid");
  });
});
