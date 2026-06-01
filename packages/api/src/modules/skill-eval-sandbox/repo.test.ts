/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  asSandboxAgentId,
  asSkillEvalCaseId,
  asSkillEvalRunId,
  asSkillEvalSuiteId,
  asSnapshotId,
} from "@skills-re/db/utils";

import { updateRunStatus, listActiveAgents, upsertSuiteWithCases } from "./repo";

describe("skill eval sandbox repo", () => {
  test("selects only safe active agent fields", async () => {
    const projections: string[][] = [];
    const calls: string[] = [];
    const row = {
      capabilitiesJson: JSON.stringify({ supportsBaseline: true }),
      defaultLimitsJson: JSON.stringify({ timeoutMs: 1 }),
      description: null,
      displayName: "Codex",
      id: asSandboxAgentId("agent-codex"),
      provider: "openai",
      runtimeFamily: "codex",
      sortOrder: 0,
      status: "active" as const,
    };
    const database = {
      select: (projection: Record<string, unknown>) => {
        projections.push(Object.keys(projection).sort());
        return {
          from: () => ({
            where: () => {
              calls.push("where");
              return {
                orderBy: () => {
                  calls.push("orderBy");
                  return Promise.resolve([row]);
                },
              };
            },
          }),
        };
      },
    };

    await expect(listActiveAgents(database as never)).resolves.toEqual([row]);
    expect(projections).toEqual([
      [
        "capabilitiesJson",
        "defaultLimitsJson",
        "description",
        "displayName",
        "id",
        "provider",
        "runtimeFamily",
        "sortOrder",
        "status",
      ],
    ]);
    expect(calls).toEqual(["where", "orderBy"]);
  });

  test("upserts suite and case metadata, then returns stored rows", async () => {
    const inserts: unknown[] = [];
    let insertCall = 0;
    const suiteRow = {
      caseCount: 1,
      evalPath: "evals/evals.json",
      fingerprint: "suite-fingerprint",
      id: asSkillEvalSuiteId("suite-1"),
      skillId: "skill-1",
      snapshotId: asSnapshotId("snapshot-1"),
      status: "valid" as const,
      syncTime: 123,
      validationErrorsJson: "[]",
    };
    const caseRow = {
      assertionsJson: JSON.stringify(["The output is a chart."]),
      caseId: "chart",
      expectedOutput: "A chart.",
      fingerprint: "case-fingerprint",
      fixturePathsJson: JSON.stringify(["evals/files/data.csv"]),
      id: asSkillEvalCaseId("case-1"),
      promptPreview: "Make a chart.",
      sortOrder: 0,
      syncTime: 124,
      title: "chart case",
    };
    const database = {
      insert: () => ({
        values: (value: unknown) => {
          inserts.push(value);
          insertCall += 1;
          if (insertCall === 1) {
            return {
              onConflictDoUpdate: () => ({
                returning: () => Promise.resolve([suiteRow]),
              }),
            };
          }
          return {
            onConflictDoUpdate: () => Promise.resolve(),
          };
        },
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve([caseRow]),
          }),
        }),
      }),
    };

    await expect(
      upsertSuiteWithCases(
        {
          caseCount: 1,
          cases: [
            {
              assertions: ["The output is a chart."],
              caseId: "chart",
              expectedOutput: "A chart.",
              fingerprint: "case-fingerprint",
              fixturePaths: ["evals/files/data.csv"],
              prompt: "Make a chart.",
              promptPreview: "Make a chart.",
              sortOrder: 0,
              title: "chart case",
            },
          ],
          evalPath: "evals/evals.json",
          fingerprint: "suite-fingerprint",
          skillId: "skill-1",
          snapshotId: asSnapshotId("snapshot-1"),
          status: "valid",
          validationErrors: [],
        },
        database as never,
      ),
    ).resolves.toEqual({
      caseCount: 1,
      cases: [
        {
          assertions: ["The output is a chart."],
          caseId: "chart",
          expectedOutput: "A chart.",
          fingerprint: "case-fingerprint",
          fixturePaths: ["evals/files/data.csv"],
          id: "case-1",
          promptPreview: "Make a chart.",
          sortOrder: 0,
          syncTime: 124,
          title: "chart case",
        },
      ],
      evalPath: "evals/evals.json",
      fingerprint: "suite-fingerprint",
      id: "suite-1",
      skillId: "skill-1",
      snapshotId: "snapshot-1",
      status: "valid",
      syncTime: 123,
      validationErrors: [],
    });
    expect(inserts).toHaveLength(2);
  });

  test("updates non-terminal run status and records transition timestamps", async () => {
    const updates: unknown[] = [];
    const database = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: asSkillEvalRunId("run-1"),
                  status: "pending" as const,
                },
              ]),
          }),
        }),
      }),
      update: () => ({
        set: (value: unknown) => ({
          where: () => {
            updates.push(value);
            return Promise.resolve();
          },
        }),
      }),
    };

    const now = 1_700_000_000_000;
    const originalNow = Date.now;
    Date.now = () => now;
    try {
      await expect(
        updateRunStatus(
          {
            runId: asSkillEvalRunId("run-1"),
            status: "queued",
          },
          database as never,
        ),
      ).resolves.toEqual({
        changed: true,
        id: "run-1",
        status: "queued",
      });
    } finally {
      Date.now = originalNow;
    }

    expect(updates).toEqual([
      {
        queuedAt: now,
        status: "queued",
        syncTime: now,
      },
    ]);
  });

  test("ignores duplicate or backward writes after a terminal run status", async () => {
    const updates: unknown[] = [];
    const database = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: asSkillEvalRunId("run-1"),
                  status: "pass" as const,
                },
              ]),
          }),
        }),
      }),
      update: () => ({
        set: (value: unknown) => ({
          where: () => {
            updates.push(value);
            return Promise.resolve();
          },
        }),
      }),
    };

    await expect(
      updateRunStatus(
        {
          runId: asSkillEvalRunId("run-1"),
          status: "running",
        },
        database as never,
      ),
    ).resolves.toEqual({
      changed: false,
      id: "run-1",
      status: "pass",
    });
    expect(updates).toEqual([]);
  });
});
