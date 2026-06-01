/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { prepareApprovedGitWorkspace } from "./git-workspace";

describe("skill eval sandbox git workspace", () => {
  test("performs an approved shallow GitHub checkout and records commit sha", async () => {
    const commands: string[] = [];
    const result = await prepareApprovedGitWorkspace({
      ref: "main",
      repoUrl: "https://github.com/acme/skills",
      sandbox: {
        exec: (command) => {
          commands.push(command);
          if (command.includes("rev-parse")) {
            return Promise.resolve({ stdout: "abc123\n", success: true });
          }
          return Promise.resolve({ success: true });
        },
      },
    });

    expect(commands).toEqual([
      "rm -rf '/workspace' && mkdir -p '/workspace'",
      "git -C '/workspace' init",
      "git -C '/workspace' remote add origin 'https://github.com/acme/skills'",
      "git -C '/workspace' fetch --depth 1 origin 'main'",
      "git -C '/workspace' checkout --detach FETCH_HEAD",
      "git -C '/workspace' rev-parse HEAD",
    ]);
    expect(result).toEqual({
      commitSha: "abc123",
      ref: "main",
      repoUrl: "https://github.com/acme/skills",
      source: "git",
      workspaceDir: "/workspace",
    });
  });

  test("rejects non-github repositories and embedded credentials", async () => {
    await expect(
      prepareApprovedGitWorkspace({
        ref: "main",
        repoUrl: "https://example.com/acme/skills",
        sandbox: {
          exec: () => Promise.resolve({ success: true }),
        },
      }),
    ).rejects.toThrow("only allows HTTPS github.com");

    await expect(
      prepareApprovedGitWorkspace({
        ref: "main",
        repoUrl: "https://token@github.com/acme/skills",
        sandbox: {
          exec: () => Promise.resolve({ success: true }),
        },
      }),
    ).rejects.toThrow("does not allow embedded credentials");
  });

  test("stops before agent execution when checkout commands fail", async () => {
    await expect(
      prepareApprovedGitWorkspace({
        ref: "missing",
        repoUrl: "https://github.com/acme/skills",
        sandbox: {
          exec: (command) =>
            Promise.resolve(
              command.includes("fetch")
                ? { stderr: "fatal: couldn't find remote ref", success: false }
                : { success: true },
            ),
        },
      }),
    ).rejects.toThrow("fatal: couldn't find remote ref");
  });
});
