/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  asEvaluationId,
  asSandboxAgentId,
  asSkillEvalCaseId,
  asSkillEvalCaseResultId,
  asSkillEvalRunId,
  asSkillEvalSuiteId,
  asSnapshotId,
  createId,
} from "./id";

describe("database id helpers", () => {
  test("returns the same value when branding a snapshot id", () => {
    const snapshotId = asSnapshotId("snap_123");
    expect(String(snapshotId)).toBe("snap_123");
  });

  test("returns the same value when branding an evaluation id", () => {
    const evaluationId = asEvaluationId("eval_123");
    expect(String(evaluationId)).toBe("eval_123");
  });

  test("returns the same values when branding skill eval sandbox ids", () => {
    expect(String(asSandboxAgentId("agent_123"))).toBe("agent_123");
    expect(String(asSkillEvalSuiteId("suite_123"))).toBe("suite_123");
    expect(String(asSkillEvalCaseId("case_123"))).toBe("case_123");
    expect(String(asSkillEvalRunId("run_123"))).toBe("run_123");
    expect(String(asSkillEvalCaseResultId("case_result_123"))).toBe("case_result_123");
  });

  test("creates a non-empty db id", () => {
    expect(createId()).toHaveLength(21);
  });
});
