/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { prepareIsolatedCaseWorkspace } from "./case-isolation";

describe("skill eval case isolation", () => {
  test("copies a clean workspace into a per-case mode directory", async () => {
    const commands: string[] = [];
    const prepared = await prepareIsolatedCaseWorkspace({
      caseId: "Happy Path 01",
      mode: "with_skill",
      sandbox: {
        exec: (command) => {
          commands.push(command);
          return Promise.resolve({ exitCode: 0, success: true });
        },
      },
      sourceWorkspaceDir: "/workspace/source",
      workspacesRoot: "/tmp/eval-workspaces",
    });

    expect(prepared.caseWorkspaceDir).toBe("/tmp/eval-workspaces/happy-path-01/with_skill");
    expect(commands).toHaveLength(1);
    expect(commands[0]).toContain("rm -rf '/tmp/eval-workspaces/happy-path-01/with_skill'");
    expect(commands[0]).toContain("mkdir -p '/tmp/eval-workspaces/happy-path-01/with_skill'");
    expect(commands[0]).toContain("tar -C '/workspace/source'");
    expect(commands[0]).toContain("--exclude './.skills-re/output'");
    expect(commands[0]).toContain("--exclude './.git'");
  });

  test("quotes shell paths and reports sandbox preparation failures", async () => {
    await expect(
      prepareIsolatedCaseWorkspace({
        caseId: "Bob's Case",
        mode: "baseline",
        sandbox: {
          exec: () => Promise.resolve({ exitCode: 1, stderr: "copy failed", success: false }),
        },
        sourceWorkspaceDir: "/workspace/bob's source",
      }),
    ).rejects.toThrow("copy failed");
  });
});
