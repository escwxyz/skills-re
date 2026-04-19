/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createSnapshotsHistoryRuntime } from "./snapshots-history";
import type { CreateSnapshotHistoryRuntimeDeps } from "./snapshots-history";

describe("createSnapshotsHistoryRuntime", () => {
  test("creates historical snapshots for the next two commits using the server github runtime", async () => {
    type HistoricalSnapshotInput = Parameters<
      CreateSnapshotHistoryRuntimeDeps["createHistoricalSnapshot"]
    >[0];
    const calls: HistoricalSnapshotInput[] = [];
    const runtime = createSnapshotsHistoryRuntime({
      createHistoricalSnapshot: (input) => {
        calls.push(input);
        return Promise.resolve(`snapshot-${calls.length}`);
      },
      githubHistory: {
        buildSkillTreeEntries: (tree) =>
          tree.map((entry) => ({
            ...entry,
            path: entry.path.split("/").at(-1) ?? entry.path,
          })),
        fetchCommitSha: ({ ref }) => Promise.resolve(`${ref.padEnd(40, "0")}`.slice(0, 40)),
        fetchSkillFilesForRoot: () =>
          Promise.resolve({
            files: [
              {
                content: "skill content",
                path: "skill.md",
              },
            ],
          }),
        fetchTree: () =>
          Promise.resolve([
            {
              path: "skills/acme/widget/skill.md",
              sha: "tree-sha-1",
              type: "blob",
            },
          ]),
        hasGithubToken: () => true,
      },
      listSkillsHistoryInfoByIds: () =>
        Promise.resolve([
          {
            directoryPath: "skills/acme/widget",
            entryPath: "skills/acme/widget/skill.md",
            id: "skill-1",
            latestDescription: "Widget skill",
            latestName: "widget",
            latestVersion: "1.2.0",
          },
        ]),
    });

    await expect(
      runtime.createHistoricalSnapshots({
        commits: [
          {
            message: "latest commit",
            sha: "latest",
            url: "https://github.com/acme/widget/commit/latest",
          },
          {
            committedDate: "2024-01-02T00:00:00.000Z",
            message: "feat: add widget",
            sha: "next-one",
            url: "https://github.com/acme/widget/commit/next-one",
          },
          {
            committedDate: "2024-01-01T00:00:00.000Z",
            message: "feat: add widget v2",
            sha: "next-two",
            url: "https://github.com/acme/widget/commit/next-two",
          },
        ],
        repoName: "widget-repo",
        repoOwner: "acme",
        skillIds: ["skill-1"],
      }),
    ).resolves.toBeNull();

    expect(calls).toEqual([
      {
        description: "Widget skill",
        directoryPath: "skills/acme/widget/",
        entryPath: "skills/acme/widget/skill.md",
        files: [
          {
            content: "skill content",
            path: "skills/acme/widget/skill.md",
          },
        ],
        name: "widget",
        skillId: "skill-1",
        sourceCommitDate: Date.parse("2024-01-02T00:00:00.000Z"),
        sourceCommitMessage: "feat: add widget",
        sourceCommitSha: "next-one00000000000000000000000000000000",
        sourceCommitUrl: "https://github.com/acme/widget/commit/next-one",
        version: "1.1.0",
      },
      {
        description: "Widget skill",
        directoryPath: "skills/acme/widget/",
        entryPath: "skills/acme/widget/skill.md",
        files: [
          {
            content: "skill content",
            path: "skills/acme/widget/skill.md",
          },
        ],
        name: "widget",
        skillId: "skill-1",
        sourceCommitDate: Date.parse("2024-01-01T00:00:00.000Z"),
        sourceCommitMessage: "feat: add widget v2",
        sourceCommitSha: "next-two00000000000000000000000000000000",
        sourceCommitUrl: "https://github.com/acme/widget/commit/next-two",
        version: "1.0.0",
      },
    ]);
  });

  test("uses the persisted skill root when backfilling history", async () => {
    type HistoricalSnapshotInput = Parameters<
      CreateSnapshotHistoryRuntimeDeps["createHistoricalSnapshot"]
    >[0];
    const calls: HistoricalSnapshotInput[] = [];
    const fetchedRoots: string[] = [];

    const runtime = createSnapshotsHistoryRuntime({
      createHistoricalSnapshot: (input) => {
        calls.push(input);
        return Promise.resolve(`snapshot-${calls.length}`);
      },
      githubHistory: {
        buildSkillTreeEntries: (tree) =>
          tree.map((entry) => ({
            ...entry,
            path: entry.path.split("/").at(-1) ?? entry.path,
          })),
        fetchCommitSha: ({ ref }) => Promise.resolve(`${ref.padEnd(40, "0")}`.slice(0, 40)),
        fetchSkillFilesForRoot: ({ skillRootPath }) => {
          fetchedRoots.push(skillRootPath);
          return Promise.resolve({
            files: [
              {
                content: "skill content",
                path: "skill.md",
              },
            ],
          });
        },
        fetchTree: () =>
          Promise.resolve([
            {
              path: "content/widget/skill.md",
              sha: "tree-sha-1",
              type: "blob",
            },
          ]),
        hasGithubToken: () => true,
      },
      listSkillsHistoryInfoByIds: () =>
        Promise.resolve([
          {
            directoryPath: "content/widget",
            entryPath: "content/widget/skill.md",
            id: "skill-1",
            latestDescription: "Widget skill",
            latestName: "widget",
            latestVersion: "1.2.0",
          },
        ]),
    });

    await expect(
      runtime.createHistoricalSnapshots({
        commits: [
          {
            message: "latest commit",
            sha: "latest",
            url: "https://github.com/acme/widget/commit/latest",
          },
          {
            committedDate: "2024-01-02T00:00:00.000Z",
            message: "feat: add widget",
            sha: "next-one",
            url: "https://github.com/acme/widget/commit/next-one",
          },
          {
            committedDate: "2024-01-01T00:00:00.000Z",
            message: "feat: add widget v2",
            sha: "next-two",
            url: "https://github.com/acme/widget/commit/next-two",
          },
        ],
        repoName: "widget-repo",
        repoOwner: "acme",
        skillIds: ["skill-1"],
      }),
    ).resolves.toBeNull();

    expect(fetchedRoots).toEqual(["content/widget", "content/widget"]);
    expect(calls[0]).toMatchObject({
      directoryPath: "content/widget/",
      files: [
        {
          path: "content/widget/skill.md",
        },
      ],
    });
  });
});
