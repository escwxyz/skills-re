/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  createSkillEvalRunInputSchema,
  skillEvalAgentSchema,
  skillEvalCaseResultSchema,
  skillEvalRunDetailSchema,
  skillEvalRunEventSchema,
  skillEvalRunHistoryInputSchema,
  skillEvalSuiteSchema,
  skillEvalStreamTokenInputSchema,
  skillEvalRunStatusSchema,
} from "./skill-eval-sandbox";

describe("skill eval sandbox contract", () => {
  test("accepts an active sandbox agent payload", () => {
    expect(
      skillEvalAgentSchema.parse({
        capabilities: {
          supportsBaseline: true,
          supportsFilesystem: true,
          supportsStreaming: true,
        },
        defaultLimits: {
          maxOutputBytes: 65_536,
          maxSteps: 64,
          timeoutMs: 120_000,
        },
        displayName: "OpenCode",
        id: "agent-opencode",
        provider: "opencode",
        runtimeFamily: "cli",
        sortOrder: 10,
        status: "active",
      }),
    ).toEqual({
      capabilities: {
        supportsBaseline: true,
        supportsFilesystem: true,
        supportsStreaming: true,
      },
      defaultLimits: {
        maxOutputBytes: 65_536,
        maxSteps: 64,
        timeoutMs: 120_000,
      },
      displayName: "OpenCode",
      id: "agent-opencode",
      provider: "opencode",
      runtimeFamily: "cli",
      sortOrder: 10,
      status: "active",
    });
  });

  test("accepts a discovered eval suite payload", () => {
    expect(
      skillEvalSuiteSchema.parse({
        caseCount: 2,
        cases: [
          {
            expectedOutput: "Creates a concise review with findings.",
            fixturePaths: ["evals/files/happy-path.diff"],
            id: "happy-path",
            promptPreview: "Review this patch",
            title: "Happy path",
          },
        ],
        evalPath: "evals/evals.json",
        fingerprint: "suite-hash",
        id: "suite-1",
        skillId: "skill-1",
        snapshotId: "snapshot-1",
        status: "valid",
        syncTime: 1_800_000_000_000,
        validationErrors: [],
      }),
    ).toEqual({
      caseCount: 2,
      cases: [
        {
          expectedOutput: "Creates a concise review with findings.",
          fixturePaths: ["evals/files/happy-path.diff"],
          id: "happy-path",
          promptPreview: "Review this patch",
          title: "Happy path",
        },
      ],
      evalPath: "evals/evals.json",
      fingerprint: "suite-hash",
      id: "suite-1",
      skillId: "skill-1",
      snapshotId: "snapshot-1",
      status: "valid",
      syncTime: 1_800_000_000_000,
      validationErrors: [],
    });
  });

  test("accepts a create run request with case selection", () => {
    expect(
      createSkillEvalRunInputSchema.parse({
        agentId: "agent-opencode",
        caseIds: ["happy-path"],
        idempotencyKey: "retry-key-1",
        includeBaseline: true,
        skillId: "skill-1",
        snapshotId: "snapshot-1",
      }),
    ).toEqual({
      agentId: "agent-opencode",
      caseIds: ["happy-path"],
      idempotencyKey: "retry-key-1",
      includeBaseline: true,
      skillId: "skill-1",
      snapshotId: "snapshot-1",
    });
  });

  test("rejects an empty case selection", () => {
    expect(() =>
      createSkillEvalRunInputSchema.parse({
        agentId: "agent-opencode",
        caseIds: [],
        skillId: "skill-1",
      }),
    ).toThrow();
  });

  test("rejects an empty agent id", () => {
    expect(() =>
      createSkillEvalRunInputSchema.parse({
        agentId: "",
        skillId: "skill-1",
      }),
    ).toThrow();
  });

  test("accepts a case result payload", () => {
    expect(
      skillEvalCaseResultSchema.parse({
        artifacts: [
          {
            description: "Raw output",
            key: "eval-runs/run-1/cases/happy-path/with_skill/output.txt",
            label: "output.txt",
          },
        ],
        baseline: {
          durationMs: 900,
          exitCode: 0,
          outputPreview: "baseline output",
          status: "fail",
        },
        caseId: "happy-path",
        id: "case-result-1",
        runId: "run-1",
        status: "pass",
        summary: "Skill output satisfied the expected behavior.",
        withSkill: {
          durationMs: 1_100,
          exitCode: 0,
          outputPreview: "with skill output",
          status: "pass",
        },
      }),
    ).toMatchObject({
      caseId: "happy-path",
      id: "case-result-1",
      runId: "run-1",
      status: "pass",
    });
  });

  test("accepts a run detail payload", () => {
    expect(
      skillEvalRunDetailSchema.parse({
        agent: {
          displayName: "OpenCode",
          id: "agent-opencode",
          provider: "opencode",
        },
        artifactPrefix: "eval-runs/run-1/",
        caseResults: [],
        completedAt: null,
        createdAt: 1_800_000_000_000,
        createdBy: "user-1",
        id: "run-1",
        limits: {
          maxOutputBytes: 65_536,
          maxSteps: 64,
          timeoutMs: 120_000,
        },
        network: {
          allowlist: [],
          blockMetadataEndpoints: true,
          blockPrivateRanges: true,
          maxBytes: 0,
          maxRequests: 0,
          mode: "deny",
        },
        policyVersion: "v1",
        skillId: "skill-1",
        snapshotId: "snapshot-1",
        status: "running",
        suiteId: "suite-1",
        summary: {
          blockedCases: 0,
          failedCases: 0,
          passedCases: 0,
          totalCases: 1,
        },
        syncTime: 1_800_000_000_000,
      }),
    ).toMatchObject({
      id: "run-1",
      status: "running",
      summary: {
        totalCases: 1,
      },
    });
  });

  test("accepts stream token input and run events", () => {
    expect(
      skillEvalStreamTokenInputSchema.parse({
        runId: "run-1",
      }),
    ).toEqual({ runId: "run-1" });

    expect(
      skillEvalRunEventSchema.parse({
        eventId: "event-1",
        kind: "stdout",
        message: "hello",
        runId: "run-1",
        sequence: 1,
        syncTime: 1_800_000_000_000,
      }),
    ).toMatchObject({
      kind: "stdout",
      runId: "run-1",
    });
  });

  test("accepts run history input", () => {
    expect(
      skillEvalRunHistoryInputSchema.parse({
        limit: 20,
        skillId: "skill-1",
      }),
    ).toEqual({
      limit: 20,
      skillId: "skill-1",
    });
  });

  test("defines terminal and non-terminal run statuses", () => {
    expect(skillEvalRunStatusSchema.parse("pending")).toBe("pending");
    expect(skillEvalRunStatusSchema.parse("pass")).toBe("pass");
    expect(skillEvalRunStatusSchema.parse("cancelled")).toBe("cancelled");
  });
});
