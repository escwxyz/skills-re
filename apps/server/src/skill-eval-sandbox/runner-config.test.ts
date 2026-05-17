/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { writeEvalRunnerWorkspaceConfig } from "./runner-config";

describe("skill eval runner workspace config", () => {
  test("writes policy/config files and creates per-case output directories", async () => {
    const mkdirs: string[] = [];
    const writes: Record<string, unknown> = {};

    const result = await writeEvalRunnerWorkspaceConfig({
      agentId: "agent-codex",
      cases: [
        {
          caseId: "Happy Path",
          fixturePaths: ["evals/files/input.txt"],
          prompt: "Run the happy path.",
        },
      ],
      includeBaseline: true,
      limits: {
        timeoutMs: 120_000,
      },
      network: {
        mode: "deny",
      },
      policyVersion: "skill-eval-sandbox-v1",
      runId: "run-1",
      sandbox: {
        mkdir: (path) => {
          mkdirs.push(path);
          return Promise.resolve();
        },
        writeFile: (path, content) => {
          writes[path] = JSON.parse(content) as unknown;
          return Promise.resolve();
        },
      },
    });

    expect(mkdirs).toEqual([
      "/workspace/.skills-re",
      "/workspace/.skills-re/output",
      "/workspace/.skills-re/output/cases/happy-path/with_skill",
      "/workspace/.skills-re/output/cases/happy-path/baseline",
    ]);
    expect(writes["/workspace/.skills-re/eval-policy.json"]).toEqual({
      limits: {
        timeoutMs: 120_000,
      },
      network: {
        mode: "deny",
      },
      policyVersion: "skill-eval-sandbox-v1",
      runId: "run-1",
    });
    expect(writes["/workspace/.skills-re/runner-config.json"]).toMatchObject({
      agentId: "agent-codex",
      includeBaseline: true,
      outputDir: "/workspace/.skills-re/output",
      runId: "run-1",
    });
    expect(result.caseDirs).toEqual([
      {
        baselineDir: "/workspace/.skills-re/output/cases/happy-path/baseline",
        caseId: "Happy Path",
        withSkillDir: "/workspace/.skills-re/output/cases/happy-path/with_skill",
      },
    ]);
  });

  test("skips baseline directories when baseline execution is disabled", async () => {
    const mkdirs: string[] = [];

    await writeEvalRunnerWorkspaceConfig({
      agentId: "agent-codex",
      cases: [{ caseId: "case-1", fixturePaths: [], prompt: "Run it." }],
      includeBaseline: false,
      limits: {},
      network: {},
      policyVersion: "policy-v1",
      runId: "run-1",
      sandbox: {
        mkdir: (path) => {
          mkdirs.push(path);
          return Promise.resolve();
        },
        writeFile: () => Promise.resolve(),
      },
    });

    expect(mkdirs).not.toContain("/workspace/.skills-re/output/cases/case-1/baseline");
  });
});
