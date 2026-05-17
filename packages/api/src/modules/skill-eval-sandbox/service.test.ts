/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  asSandboxAgentId,
  asSkillEvalCaseId,
  asSkillEvalCaseResultId,
  asSkillEvalRunId,
  asSkillEvalSuiteId,
  asSnapshotId,
} from "@skills-re/db/utils";

import { createSkillEvalSandboxService } from "./service";

describe("skill eval sandbox service", () => {
  test("lists active agents with safe display metadata", async () => {
    const service = createSkillEvalSandboxService({
      listActiveAgents: () =>
        Promise.resolve([
          {
            capabilitiesJson: JSON.stringify({
              supportsBaseline: true,
              supportsFilesystem: true,
              supportsStreaming: true,
              supportsTokenUsage: true,
            }),
            defaultLimitsJson: JSON.stringify({
              maxOutputBytes: 65_536,
              maxSteps: 64,
              timeoutMs: 120_000,
            }),
            description: "Runs evals with Codex.",
            displayName: "Codex",
            id: asSandboxAgentId("agent-codex"),
            provider: "openai",
            runtimeFamily: "codex",
            sortOrder: 10,
            status: "active",
          },
        ]),
    });

    await expect(service.listAgents()).resolves.toEqual([
      {
        capabilities: {
          supportsBaseline: true,
          supportsFilesystem: true,
          supportsStreaming: true,
          supportsTokenUsage: true,
        },
        defaultLimits: {
          maxOutputBytes: 65_536,
          maxSteps: 64,
          timeoutMs: 120_000,
        },
        description: "Runs evals with Codex.",
        displayName: "Codex",
        id: "agent-codex",
        provider: "openai",
        runtimeFamily: "codex",
        sortOrder: 10,
        status: "active",
      },
    ]);
  });

  test("omits active rows with invalid agent configuration", async () => {
    const service = createSkillEvalSandboxService({
      listActiveAgents: () =>
        Promise.resolve([
          {
            capabilitiesJson: "{",
            defaultLimitsJson: JSON.stringify({
              maxOutputBytes: 65_536,
              maxSteps: 64,
              timeoutMs: 120_000,
            }),
            description: null,
            displayName: "Broken Agent",
            id: asSandboxAgentId("agent-broken"),
            provider: "broken",
            runtimeFamily: "broken",
            sortOrder: 99,
            status: "active",
          },
        ]),
    });

    await expect(service.listAgents()).resolves.toEqual([]);
  });

  test("resolves the latest snapshot eval suite, validates fixtures, persists metadata", async () => {
    const persistedInputs: unknown[] = [];
    const service = createSkillEvalSandboxService({
      getSnapshotById: () =>
        Promise.resolve({
          directoryPath: "skills/acme/csv-analyzer/",
          id: asSnapshotId("snapshot-1"),
          skillId: "skill-1",
          syncTime: 123,
          version: "1.0.0",
        }),
      listSnapshotsPageBySkill: () =>
        Promise.resolve({
          isDone: true,
          nextCursor: null,
          page: [
            {
              directoryPath: "skills/acme/csv-analyzer/",
              id: asSnapshotId("snapshot-1"),
              skillId: "skill-1",
              syncTime: 123,
              version: "1.0.0",
            },
          ],
        }),
      listSnapshotFiles: () =>
        Promise.resolve([
          {
            contentType: "application/json",
            fileHash: "hash-evals",
            path: "skills/acme/csv-analyzer/evals/evals.json",
            r2Key: "snapshots/evals.json",
            size: 320,
            sourceSha: null,
          },
          {
            contentType: "text/csv",
            fileHash: "hash-csv",
            path: "skills/acme/csv-analyzer/evals/files/sales.csv",
            r2Key: "snapshots/sales.csv",
            size: 42,
            sourceSha: null,
          },
        ]),
      readSnapshotFileContent: (input) => {
        expect(input).toMatchObject({
          path: "evals/evals.json",
          snapshotId: "snapshot-1",
        });
        return Promise.resolve({
          bytesRead: 320,
          content: JSON.stringify({
            evals: [
              {
                expected_output: "A summary of sales trends.",
                files: ["evals/files/sales.csv"],
                id: 1,
                prompt: "Summarize sales.csv.",
                title: "sales summary",
              },
            ],
            skill_name: "csv-analyzer",
          }),
          isTruncated: false,
          offset: 0,
          totalBytes: 320,
        });
      },
      upsertSuiteWithCases: (input) => {
        persistedInputs.push(input);
        return Promise.resolve({
          caseCount: input.caseCount,
          cases: input.cases.map((caseItem, index) => ({
            ...caseItem,
            id: `case-db-${index + 1}`,
            syncTime: 456,
          })),
          evalPath: input.evalPath,
          fingerprint: input.fingerprint,
          id: asSkillEvalSuiteId("suite-1"),
          skillId: input.skillId,
          snapshotId: input.snapshotId,
          status: input.status,
          syncTime: 456,
          validationErrors: input.validationErrors,
        });
      },
    });

    const suite = await service.getSuite({ skillId: "skill-1" });

    expect(suite).toMatchObject({
      caseCount: 1,
      evalPath: "evals/evals.json",
      id: "suite-1",
      skillId: "skill-1",
      snapshotId: "snapshot-1",
      status: "valid",
      syncTime: 456,
      validationErrors: [],
    });
    expect(suite.fingerprint).toBeString();
    expect(suite.cases).toEqual([
      {
        expectedOutput: "A summary of sales trends.",
        fixturePaths: ["evals/files/sales.csv"],
        id: "1",
        promptPreview: "Summarize sales.csv.",
        title: "sales summary",
      },
    ]);
    expect(persistedInputs).toHaveLength(1);
    expect(persistedInputs[0]).toMatchObject({
      caseCount: 1,
      evalPath: "evals/evals.json",
      skillId: "skill-1",
      snapshotId: "snapshot-1",
      status: "valid",
      validationErrors: [],
    });
  });

  test("returns and persists a missing suite when the selected snapshot has no eval file", async () => {
    const persistedInputs: unknown[] = [];
    const service = createSkillEvalSandboxService({
      getSnapshotById: () =>
        Promise.resolve({
          directoryPath: "",
          id: asSnapshotId("snapshot-2"),
          skillId: "skill-1",
          syncTime: 123,
          version: "1.0.1",
        }),
      listSnapshotFiles: () => Promise.resolve([]),
      readSnapshotFileContent: () => Promise.reject(new Error("File not found in snapshot.")),
      upsertSuiteWithCases: (input) => {
        persistedInputs.push(input);
        return Promise.resolve({
          caseCount: 0,
          cases: [],
          evalPath: input.evalPath,
          fingerprint: input.fingerprint,
          id: asSkillEvalSuiteId("suite-missing"),
          skillId: input.skillId,
          snapshotId: input.snapshotId,
          status: input.status,
          syncTime: 789,
          validationErrors: input.validationErrors,
        });
      },
    });

    await expect(
      service.getSuite({ skillId: "skill-1", snapshotId: "snapshot-2" }),
    ).resolves.toEqual({
      caseCount: 0,
      cases: [],
      evalPath: "evals/evals.json",
      fingerprint: "missing:snapshot-2",
      id: "suite-missing",
      skillId: "skill-1",
      snapshotId: "snapshot-2",
      status: "missing",
      syncTime: 789,
      validationErrors: ["evals/evals.json was not found in this snapshot"],
    });
    expect(persistedInputs).toHaveLength(1);
  });

  test("creates an eval run for a public skill and enqueues execution", async () => {
    const enqueued: unknown[] = [];
    const insertedRuns: unknown[] = [];
    const service = createSkillEvalSandboxService({
      findRunByIdempotencyKey: () => Promise.resolve(null),
      getRunnableSkillById: () =>
        Promise.resolve({
          id: "skill-1",
          latestSnapshotId: asSnapshotId("snapshot-1"),
          visibility: "public",
        }),
      getSnapshotById: () =>
        Promise.resolve({
          directoryPath: "",
          id: asSnapshotId("snapshot-1"),
          skillId: "skill-1",
          syncTime: 123,
          version: "1.0.0",
        }),
      insertRun: (input) => {
        insertedRuns.push(input);
        return Promise.resolve({
          id: asSkillEvalRunId(input.id),
          status: "pending",
        });
      },
      listActiveAgents: () =>
        Promise.resolve([
          {
            capabilitiesJson: JSON.stringify({
              supportsBaseline: true,
              supportsFilesystem: true,
              supportsStreaming: true,
            }),
            defaultLimitsJson: JSON.stringify({
              maxOutputBytes: 65_536,
              maxSteps: 64,
              timeoutMs: 120_000,
            }),
            description: null,
            displayName: "Codex",
            id: asSandboxAgentId("agent-codex"),
            provider: "openai",
            runtimeFamily: "codex",
            sortOrder: 0,
            status: "active",
          },
        ]),
      listSnapshotFiles: () =>
        Promise.resolve([
          {
            contentType: "application/json",
            fileHash: "hash-evals",
            path: "evals/evals.json",
            r2Key: "snapshots/evals.json",
            size: 300,
            sourceSha: null,
          },
        ]),
      readSnapshotFileContent: () =>
        Promise.resolve({
          bytesRead: 300,
          content: JSON.stringify({
            evals: [
              {
                expected_output: "A summary.",
                id: "case-1",
                prompt: "Summarize the data.",
              },
            ],
            skill_name: "summary",
          }),
          isTruncated: false,
          offset: 0,
          totalBytes: 300,
        }),
      runScheduler: {
        enqueue: (input) => {
          enqueued.push(input);
          return Promise.resolve({ workId: "workflow-1" });
        },
      },
      upsertSuiteWithCases: (input) =>
        Promise.resolve({
          caseCount: input.caseCount,
          cases: input.cases.map((caseItem) => ({
            ...caseItem,
            id: "case-db-1",
            syncTime: 456,
          })),
          evalPath: input.evalPath,
          fingerprint: input.fingerprint,
          id: asSkillEvalSuiteId("suite-1"),
          skillId: input.skillId,
          snapshotId: input.snapshotId,
          status: input.status,
          syncTime: 456,
          validationErrors: input.validationErrors,
        }),
    });

    const created = await service.createRun(
      {
        agentId: "agent-codex",
        idempotencyKey: "retry-1",
        skillId: "skill-1",
      },
      { userId: "user-1" },
    );
    expect(created).toEqual({
      runId: expect.any(String),
      status: "pending",
    });
    expect(insertedRuns).toHaveLength(1);
    const insertedRun = insertedRuns[0] as { id: string };
    expect(insertedRuns[0]).toMatchObject({
      agentId: "agent-codex",
      artifactPrefix: `eval-runs/${insertedRun.id}`,
      createdBy: "user-1",
      id: insertedRun.id,
      idempotencyKey: "retry-1",
      policyVersion: "skill-eval-sandbox-v1",
      skillId: "skill-1",
      snapshotId: "snapshot-1",
      status: "pending",
      suiteId: "suite-1",
      totalCases: 1,
    });
    expect(enqueued).toEqual([
      {
        includeBaseline: false,
        runId: insertedRun.id,
      },
    ]);
  });

  test("returns an existing idempotent run without enqueueing duplicate work", async () => {
    const enqueued: unknown[] = [];
    const service = createSkillEvalSandboxService({
      findRunByIdempotencyKey: () =>
        Promise.resolve({
          id: asSkillEvalRunId("run-existing"),
          status: "queued",
        }),
      runScheduler: {
        enqueue: (input) => {
          enqueued.push(input);
          return Promise.resolve({ workId: "workflow-1" });
        },
      },
    });

    await expect(
      service.createRun(
        {
          agentId: "agent-codex",
          idempotencyKey: "retry-1",
          skillId: "skill-1",
        },
        { userId: "user-1" },
      ),
    ).resolves.toEqual({
      runId: "run-existing",
      status: "queued",
    });
    expect(enqueued).toEqual([]);
  });

  test("rejects unauthenticated create run requests", async () => {
    const service = createSkillEvalSandboxService();

    await expect(
      service.createRun(
        {
          agentId: "agent-codex",
          skillId: "skill-1",
        },
        { userId: "" },
      ),
    ).rejects.toThrow("Authentication required.");
  });

  test("rejects create run when the selected agent is inactive or unknown", async () => {
    const service = createSkillEvalSandboxService({
      findRunByIdempotencyKey: () => Promise.resolve(null),
      getRunnableSkillById: () =>
        Promise.resolve({
          id: "skill-1",
          latestSnapshotId: asSnapshotId("snapshot-1"),
          visibility: "public",
        }),
      listActiveAgents: () => Promise.resolve([]),
      runScheduler: {
        enqueue: () => Promise.resolve({ workId: "workflow-1" }),
      },
    });

    await expect(
      service.createRun(
        {
          agentId: "agent-missing",
          skillId: "skill-1",
        },
        { userId: "user-1" },
      ),
    ).rejects.toThrow("Sandbox agent is not active or configured.");
  });

  test("rejects create run for non-public skills", async () => {
    const service = createSkillEvalSandboxService({
      findRunByIdempotencyKey: () => Promise.resolve(null),
      getRunnableSkillById: () =>
        Promise.resolve({
          id: "skill-1",
          latestSnapshotId: asSnapshotId("snapshot-1"),
          visibility: "private",
        }),
      listActiveAgents: () => Promise.resolve([]),
      runScheduler: {
        enqueue: () => Promise.resolve({ workId: "workflow-1" }),
      },
    });

    await expect(
      service.createRun(
        {
          agentId: "agent-codex",
          skillId: "skill-1",
        },
        { userId: "user-1" },
      ),
    ).rejects.toThrow("Skill is not publicly runnable.");
  });

  test("rejects create run when the skill eval suite is unavailable", async () => {
    const service = createSkillEvalSandboxService({
      findRunByIdempotencyKey: () => Promise.resolve(null),
      getRunnableSkillById: () =>
        Promise.resolve({
          id: "skill-1",
          latestSnapshotId: asSnapshotId("snapshot-1"),
          visibility: "public",
        }),
      getSnapshotById: () =>
        Promise.resolve({
          directoryPath: "",
          id: asSnapshotId("snapshot-1"),
          skillId: "skill-1",
          syncTime: 123,
          version: "1.0.0",
        }),
      listActiveAgents: () =>
        Promise.resolve([
          {
            capabilitiesJson: JSON.stringify({
              supportsBaseline: true,
              supportsFilesystem: true,
              supportsStreaming: true,
            }),
            defaultLimitsJson: JSON.stringify({
              maxOutputBytes: 65_536,
              maxSteps: 64,
              timeoutMs: 120_000,
            }),
            description: null,
            displayName: "Codex",
            id: asSandboxAgentId("agent-codex"),
            provider: "openai",
            runtimeFamily: "codex",
            sortOrder: 0,
            status: "active",
          },
        ]),
      readSnapshotFileContent: () => Promise.reject(new Error("File not found in snapshot.")),
      runScheduler: {
        enqueue: () => Promise.resolve({ workId: "workflow-1" }),
      },
      upsertSuiteWithCases: (input) =>
        Promise.resolve({
          caseCount: 0,
          cases: [],
          evalPath: input.evalPath,
          fingerprint: input.fingerprint,
          id: asSkillEvalSuiteId("suite-missing"),
          skillId: input.skillId,
          snapshotId: input.snapshotId,
          status: input.status,
          syncTime: 456,
          validationErrors: input.validationErrors,
        }),
    });

    await expect(
      service.createRun(
        {
          agentId: "agent-codex",
          skillId: "skill-1",
        },
        { userId: "user-1" },
      ),
    ).rejects.toThrow("Skill eval suite is not runnable.");
  });

  test("lists run history with newest-first pagination metadata", async () => {
    const service = createSkillEvalSandboxService({
      listRunsBySkill: (input) => {
        expect(input).toMatchObject({
          limit: 20,
          skillId: "skill-1",
        });
        return Promise.resolve({
          isDone: true,
          nextCursor: null,
          page: [
            {
              agentDisplayName: "Codex",
              agentId: asSandboxAgentId("agent-codex"),
              agentProvider: "openai",
              blockedCases: 0,
              completedAt: 1_700_000_000_500,
              createdAt: new Date(1_700_000_000_000),
              failedCases: 0,
              id: asSkillEvalRunId("run-1"),
              passedCases: 1,
              skillId: "skill-1",
              snapshotId: asSnapshotId("snapshot-1"),
              snapshotVersion: "1.0.0",
              status: "pass",
              syncTime: 1_700_000_000_600,
              tokenCount: 1234,
              totalCases: 1,
              totalDurationMs: 500,
            },
          ],
        });
      },
    });

    await expect(service.listRunsBySkill({ limit: 20, skillId: "skill-1" })).resolves.toEqual({
      continueCursor: "",
      isDone: true,
      page: [
        {
          agent: {
            displayName: "Codex",
            id: "agent-codex",
            provider: "openai",
          },
          completedAt: 1_700_000_000_500,
          createdAt: 1_700_000_000_000,
          id: "run-1",
          skillId: "skill-1",
          snapshotId: "snapshot-1",
          snapshotVersion: "1.0.0",
          status: "pass",
          summary: {
            blockedCases: 0,
            failedCases: 0,
            passedCases: 1,
            totalCases: 1,
          },
          syncTime: 1_700_000_000_600,
          tokenCount: 1234,
          totalDurationMs: 500,
        },
      ],
    });
  });

  test("decodes run history cursors before calling the repo", async () => {
    const cursor = btoa(JSON.stringify({ id: "run-2", syncTime: 1_700_000_000_600 }))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    const service = createSkillEvalSandboxService({
      listRunsBySkill: (input) => {
        expect(input.cursor).toEqual({
          id: "run-2",
          syncTime: 1_700_000_000_600,
        });
        return Promise.resolve({
          isDone: true,
          nextCursor: null,
          page: [],
        });
      },
    });

    await expect(service.listRunsBySkill({ cursor, skillId: "skill-1" })).resolves.toEqual({
      continueCursor: "",
      isDone: true,
      page: [],
    });
  });

  test("loads authorized run detail with case results and policy snapshots", async () => {
    const service = createSkillEvalSandboxService({
      getRunDetailById: () =>
        Promise.resolve({
          agentDisplayName: "Codex",
          agentId: asSandboxAgentId("agent-codex"),
          agentProvider: "openai",
          artifactPrefix: "eval-runs/run-1",
          blockedCases: 0,
          completedAt: 1_700_000_000_500,
          createdAt: new Date(1_700_000_000_000),
          createdBy: "user-1",
          errorCode: null,
          errorMessage: null,
          failedCases: 0,
          id: asSkillEvalRunId("run-1"),
          limitsJson: JSON.stringify({
            maxOutputBytes: 65_536,
            maxSteps: 64,
            timeoutMs: 120_000,
          }),
          networkJson: JSON.stringify({
            allowlist: [],
            blockMetadataEndpoints: true,
            blockPrivateRanges: true,
            maxBytes: 0,
            maxRequests: 0,
            mode: "deny",
          }),
          passedCases: 1,
          policyVersion: "skill-eval-sandbox-v1",
          skillId: "skill-1",
          snapshotId: asSnapshotId("snapshot-1"),
          snapshotVersion: "1.0.0",
          status: "pass",
          suiteId: asSkillEvalSuiteId("suite-1"),
          syncTime: 1_700_000_000_600,
          totalCases: 1,
        }),
      listCaseResultsByRun: () =>
        Promise.resolve([
          {
            baselineArtifactsJson: null,
            baselineDurationMs: null,
            baselineErrorCode: null,
            baselineErrorMessage: null,
            baselineExitCode: null,
            baselineOutputPreview: null,
            baselineScore: null,
            baselineStatus: null,
            baselineTokenCount: null,
            caseId: "case-1",
            id: asSkillEvalCaseResultId("result-1"),
            runId: asSkillEvalRunId("run-1"),
            status: "pass",
            summary: "Matched expected output.",
            withSkillArtifactsJson: JSON.stringify([
              {
                key: "eval-runs/run-1/cases/case-1/output.txt",
                label: "output.txt",
                size: 128,
              },
            ]),
            withSkillDurationMs: 500,
            withSkillErrorCode: null,
            withSkillErrorMessage: null,
            withSkillExitCode: 0,
            withSkillOutputPreview: "Done.",
            withSkillScore: 100,
            withSkillStatus: "pass",
            withSkillTokenCount: 1234,
          },
        ]),
    });

    await expect(
      service.getRunDetail({ runId: "run-1" }, { userId: "user-1" }),
    ).resolves.toMatchObject({
      agent: {
        displayName: "Codex",
        id: "agent-codex",
        provider: "openai",
      },
      artifactPrefix: "eval-runs/run-1",
      caseResults: [
        {
          artifacts: [
            {
              key: "eval-runs/run-1/cases/case-1/output.txt",
              label: "output.txt",
              size: 128,
            },
          ],
          baseline: null,
          caseId: "case-1",
          id: "result-1",
          runId: "run-1",
          status: "pass",
          summary: "Matched expected output.",
          withSkill: {
            artifacts: [
              {
                key: "eval-runs/run-1/cases/case-1/output.txt",
                label: "output.txt",
                size: 128,
              },
            ],
            durationMs: 500,
            exitCode: 0,
            outputPreview: "Done.",
            score: 1,
            status: "pass",
            tokenCount: 1234,
          },
        },
      ],
      createdAt: 1_700_000_000_000,
      createdBy: "user-1",
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
      summary: {
        blockedCases: 0,
        failedCases: 0,
        passedCases: 1,
        totalCases: 1,
      },
    });
  });

  test("denies run detail for another user's run", async () => {
    const service = createSkillEvalSandboxService({
      getRunDetailById: () =>
        Promise.resolve({
          agentDisplayName: "Codex",
          agentId: asSandboxAgentId("agent-codex"),
          agentProvider: "openai",
          artifactPrefix: "eval-runs/run-1",
          blockedCases: 0,
          completedAt: null,
          createdAt: new Date(1_700_000_000_000),
          createdBy: "user-2",
          errorCode: null,
          errorMessage: null,
          failedCases: 0,
          id: asSkillEvalRunId("run-1"),
          limitsJson: "{}",
          networkJson: "{}",
          passedCases: 0,
          policyVersion: "skill-eval-sandbox-v1",
          skillId: "skill-1",
          snapshotId: asSnapshotId("snapshot-1"),
          snapshotVersion: "1.0.0",
          status: "running",
          suiteId: asSkillEvalSuiteId("suite-1"),
          syncTime: 1_700_000_000_600,
          totalCases: 1,
        }),
      listCaseResultsByRun: () => Promise.resolve([]),
    });

    await expect(service.getRunDetail({ runId: "run-1" }, { userId: "user-1" })).rejects.toThrow(
      "Run is not authorized.",
    );
  });
});
