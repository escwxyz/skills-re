/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  buildOpenCodeEvalCommand,
  buildOpenCodeEvalPrompt,
  runOpenCodeEvalCaseModes,
} from "./opencode-adapter";

describe("skill eval OpenCode adapter", () => {
  test("builds with-skill and baseline prompts", () => {
    const caseItem = {
      caseId: "case-1",
      expectedOutput: "A CSV summary.",
      fixturePaths: ["evals/files/sales.csv"],
      prompt: "Summarize sales.csv.",
    };

    expect(buildOpenCodeEvalPrompt(caseItem, "with_skill")).toContain("Use the skill instructions");
    expect(buildOpenCodeEvalPrompt(caseItem, "baseline")).toContain(
      "without using the skill instructions",
    );
    expect(buildOpenCodeEvalPrompt(caseItem, "with_skill")).toContain("evals/files/sales.csv");
  });

  test("builds a non-interactive opencode run command", () => {
    expect(
      buildOpenCodeEvalCommand({
        model: "anthropic/claude-sonnet-4-5",
        prompt: "Run Bob's eval.",
      }),
    ).toContain(
      "opencode run --format json --model 'anthropic/claude-sonnet-4-5' --dir '/workspace'",
    );
  });

  test("runs with-skill and optional baseline modes", async () => {
    const commands: string[] = [];
    const result = await runOpenCodeEvalCaseModes({
      caseItem: {
        caseId: "case 1",
        fixturePaths: [],
        prompt: "Summarize the input.",
      },
      includeBaseline: true,
      model: "anthropic/claude-sonnet-4-5",
      sandbox: {
        exec: (command) => {
          commands.push(command);
          return Promise.resolve({
            exitCode: 0,
            stdout: "ok",
            success: true,
          });
        },
      },
      workspacesRoot: "/tmp/evals",
    });

    expect(commands).toHaveLength(4);
    expect(result.withSkill.success).toBe(true);
    expect(result.baseline?.success).toBe(true);
    expect(commands[0]).toContain("rm -rf '/tmp/evals/case-1/with_skill'");
    expect(commands[1]).toContain("--dir '/tmp/evals/case-1/with_skill'");
    expect(commands[1]).toContain("Use the skill instructions");
    expect(commands[2]).toContain("rm -rf '/tmp/evals/case-1/baseline'");
    expect(commands[3]).toContain("--dir '/tmp/evals/case-1/baseline'");
    expect(commands[3]).toContain("without using the skill instructions");
  });

  test("can run modes without isolated workspaces for direct adapter tests", async () => {
    const commands: string[] = [];
    await runOpenCodeEvalCaseModes({
      caseItem: {
        caseId: "case-1",
        fixturePaths: [],
        prompt: "Summarize the input.",
      },
      includeBaseline: false,
      isolateWorkspaces: false,
      model: "anthropic/claude-sonnet-4-5",
      sandbox: {
        exec: (command) => {
          commands.push(command);
          return Promise.resolve({ exitCode: 0, stdout: "ok", success: true });
        },
      },
    });

    expect(commands).toHaveLength(1);
    expect(commands[0]).toContain("--dir '/workspace'");
  });

  test("returns failed mode results when the agent command fails", async () => {
    const result = await runOpenCodeEvalCaseModes({
      caseItem: {
        caseId: "case-1",
        fixturePaths: [],
        prompt: "Summarize the input.",
      },
      includeBaseline: false,
      isolateWorkspaces: false,
      model: "anthropic/claude-sonnet-4-5",
      sandbox: {
        exec: () =>
          Promise.resolve({
            exitCode: 2,
            stderr: "agent failed",
            success: false,
          }),
      },
    });

    expect(result.withSkill.success).toBe(false);
    expect(result.withSkill.exitCode).toBe(2);
    expect(result.withSkill.stderr).toBe("agent failed");
  });
});
