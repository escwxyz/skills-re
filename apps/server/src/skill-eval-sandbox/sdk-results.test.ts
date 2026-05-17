/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  createAgentSkillsEvalSdkArtifactPaths,
  createAgentSkillsEvalSdkCaseResultSummaries,
  getAgentSkillsEvalSdkRunStatus,
  summarizeAgentSkillsEvalSdkResult,
} from "./sdk-results";
import type { EvaluateSkillsResult, SkillsEvent } from "agent-skills-eval";

describe("agent-skills-eval SDK result mapping", () => {
  test("summarizes SDK run status", () => {
    const result: EvaluateSkillsResult = {
      failed: 1,
      passed: 2,
      skills: [],
      workspaceRoot: "/workspace/out",
    };

    const summary = summarizeAgentSkillsEvalSdkResult(result);
    expect(summary).toEqual({
      blockedCases: 0,
      failedCases: 1,
      passedCases: 2,
      totalCases: 3,
    });
    expect(getAgentSkillsEvalSdkRunStatus(summary)).toBe("fail");
  });

  test("maps eval-end events into case result summaries", () => {
    const events: SkillsEvent[] = [
      {
        evalIndex: 0,
        evalSlug: "case-1",
        grading: {
          assertion_results: [],
          summary: { failed: 0, pass_rate: 1, passed: 1, total: 1 },
        },
        mode: "with_skill",
        output: "with skill output",
        skill: "demo",
        timing: { duration_ms: 100, total_tokens: 20 },
        type: "eval-end",
      },
      {
        evalIndex: 0,
        evalSlug: "case-1",
        grading: {
          assertion_results: [],
          summary: { failed: 1, pass_rate: 0, passed: 0, total: 1 },
        },
        mode: "without_skill",
        output: "baseline output",
        skill: "demo",
        timing: { duration_ms: 50, total_tokens: 10 },
        type: "eval-end",
      },
    ];

    expect(createAgentSkillsEvalSdkCaseResultSummaries(events)).toEqual([
      {
        baseline: {
          durationMs: 50,
          outputPreview: "baseline output",
          score: 0,
          status: "fail",
          tokenCount: 10,
        },
        caseId: "case-1",
        status: "fail",
        summary: "With-skill pass; baseline fail.",
        withSkill: {
          durationMs: 100,
          outputPreview: "with skill output",
          score: 1,
          status: "pass",
          tokenCount: 20,
        },
      },
    ]);
  });

  test("collects selected SDK artifact paths", () => {
    expect(
      createAgentSkillsEvalSdkArtifactPaths({
        failed: 0,
        passed: 1,
        reportPath: "/workspace/out/report/index.html",
        skills: [
          {
            benchmarkPath: "/workspace/out/iteration-1/demo/benchmark.json",
            evals: 1,
            passRate: 1,
            relPath: ".",
            skill: "demo",
            slug: "demo",
          },
        ],
        workspaceRoot: "/workspace/out",
      }),
    ).toEqual([
      "/workspace/out/iteration-1/demo/benchmark.json",
      "/workspace/out/report/index.html",
    ]);
  });
});
