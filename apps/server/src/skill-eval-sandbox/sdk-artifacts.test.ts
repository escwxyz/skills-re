/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  createAgentSkillsEvalSdkArtifactKey,
  uploadAgentSkillsEvalSdkArtifacts,
} from "./sdk-artifacts";

describe("agent-skills-eval SDK artifact upload", () => {
  test("creates sanitized R2 keys under the run prefix", () => {
    expect(
      createAgentSkillsEvalSdkArtifactKey({
        artifactPath: "/workspace/out/report/index.html",
        artifactPrefix: "eval-runs/run-1",
        workspaceRoot: "/workspace/out",
      }),
    ).toBe("eval-runs/run-1/sdk/report/index.html");
  });

  test("uploads selected SDK artifacts", async () => {
    const written = new Map<string, unknown>();
    await expect(
      uploadAgentSkillsEvalSdkArtifacts({
        artifactPaths: ["/workspace/out/benchmark.json", "/workspace/out/report/index.html"],
        artifactPrefix: "eval-runs/run-1",
        bucket: {
          put: (key, value) => {
            written.set(key, value);
            return Promise.resolve();
          },
        },
        sandbox: {
          readFile: (path) => Promise.resolve(`content:${path}`),
        },
        workspaceRoot: "/workspace/out",
      }),
    ).resolves.toEqual([
      { key: "eval-runs/run-1/sdk/benchmark.json", path: "/workspace/out/benchmark.json" },
      {
        key: "eval-runs/run-1/sdk/report/index.html",
        path: "/workspace/out/report/index.html",
      },
    ]);
    expect(written.get("eval-runs/run-1/sdk/benchmark.json")).toBe(
      "content:/workspace/out/benchmark.json",
    );
  });
});
