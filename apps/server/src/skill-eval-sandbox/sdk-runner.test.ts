/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  AGENT_SKILLS_EVAL_PACKAGE_VERSION,
  buildAgentSkillsEvalRunnerCommand,
  createAgentSkillsEvalRunnerConfig,
  createOpenAICompatibleSdkProviderConfig,
  createOpenCodeSdkProviderConfig,
  writeAgentSkillsEvalRunnerConfig,
} from "./sdk-runner";

describe("agent-skills-eval SDK runner config", () => {
  test("pins the SDK package version used by the sandbox image", () => {
    expect(AGENT_SKILLS_EVAL_PACKAGE_VERSION).toBe("0.1.1");
  });

  test("creates a run-specific SDK config", () => {
    const config = createAgentSkillsEvalRunnerConfig({
      baseline: true,
      judge: createOpenAICompatibleSdkProviderConfig({
        apiKeyEnv: "OPENAI_API_KEY",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        providerName: "openai",
      }),
      runId: "run-1",
      target: createOpenCodeSdkProviderConfig({ model: "anthropic/claude-sonnet-4" }),
    });

    expect(config).toMatchObject({
      baseline: true,
      concurrency: 1,
      root: "/workspace",
      runId: "run-1",
      strict: true,
      workspaceLayout: "iteration",
    });
    expect(config.eventsPath).toBe("/workspace/.skills-re/agent-skills-eval-events.jsonl");
    expect(config.summaryPath).toBe("/workspace/.skills-re/agent-skills-eval-summary.json");
  });

  test("writes config into the sandbox workspace", async () => {
    const writes = new Map<string, string>();
    const config = createAgentSkillsEvalRunnerConfig({
      judge: createOpenAICompatibleSdkProviderConfig({
        apiKeyEnv: "OPENAI_API_KEY",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        providerName: "openai",
      }),
      runId: "run-1",
      target: createOpenCodeSdkProviderConfig({ model: "opencode-model" }),
    });

    await expect(
      writeAgentSkillsEvalRunnerConfig({
        config,
        sandbox: {
          mkdir: () => Promise.resolve(),
          writeFile: (path, content) => {
            writes.set(path, content);
            return Promise.resolve();
          },
        },
      }),
    ).resolves.toEqual({
      configPath: "/workspace/.skills-re/agent-skills-eval.json",
    });
    expect(JSON.parse(writes.get("/workspace/.skills-re/agent-skills-eval.json") ?? "{}")).toEqual(
      config,
    );
  });

  test("builds a quoted runner command", () => {
    expect(
      buildAgentSkillsEvalRunnerCommand({
        configPath: "/workspace/.skills-re/agent-skills-eval.json",
      }),
    ).toBe(
      "node '/usr/local/bin/skills-re-agent-skills-eval-runner.mjs' --config '/workspace/.skills-re/agent-skills-eval.json'",
    );
  });
});
