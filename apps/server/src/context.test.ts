/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createServerContextFromBase } from "./context";

describe("createServerContextFromBase", () => {
  test("preserves an injected repo stats workflow scheduler", () => {
    const context = createServerContextFromBase(
      {
        auth: null,
        session: null,
      },
      {
        workflowSchedulers: {
          repoStatsSync: {
            enqueue() {
              return Promise.resolve({ workId: "workflow-1" });
            },
          },
        },
      },
    );

    expect(context.workflowSchedulers?.repoStatsSync).toBeDefined();
  });

  test("leaves workflow schedulers unset when nothing is injected", () => {
    const context = createServerContextFromBase(
      {
        auth: null,
        session: null,
      },
      {},
    );

    expect(context.workflowSchedulers).toBeUndefined();
  });

  test("preserves injected ai search runtime", () => {
    const context = createServerContextFromBase(
      {
        auth: null,
        session: null,
      },
      {
        aiSearch: {
          search() {
            return Promise.resolve({
              data: [],
              has_more: false,
            });
          },
        },
      },
    );

    expect(context.aiSearch).toBeDefined();
  });

  test("preserves injected ai task runtime", () => {
    const context = createServerContextFromBase(
      {
        auth: null,
        session: null,
      },
      {
        aiTasks: {
          getAdapters() {
            return {} as never;
          },
        },
      },
    );

    expect(context.aiTasks).toBeDefined();
  });

  test("preserves injected snapshot workflow schedulers", () => {
    const context = createServerContextFromBase(
      {
        auth: null,
        session: null,
      },
      {
        workflowSchedulers: {
          snapshotUpload: {
            enqueue() {
              return Promise.resolve({ workId: "snapshot-upload-1" });
            },
          },
          snapshotArchiveUpload: {
            enqueue() {
              return Promise.resolve({ workId: "snapshot-archive-upload-1" });
            },
          },
          skillsUpload: {
            enqueue() {
              return Promise.resolve({ workId: "skills-upload-1" });
            },
          },
        },
      },
    );

    expect(context.workflowSchedulers?.snapshotUpload).toBeDefined();
    expect(context.workflowSchedulers?.snapshotArchiveUpload).toBeDefined();
    expect(context.workflowSchedulers?.skillsUpload).toBeDefined();
  });

  test("preserves injected github history helpers and snapshot runtime", () => {
    const context = createServerContextFromBase(
      {
        auth: null,
        session: null,
      },
      {
        githubHistory: {
          buildSkillTreeEntries() {
            return [];
          },
          fetchCommitSha: () => Promise.resolve("0123456789abcdef0123456789abcdef01234567"),
          fetchSkillFilesForRoot: () => Promise.resolve({ files: [] }),
          fetchTree: () => Promise.resolve([]),
          hasGithubToken: () => true,
        },
        githubSubmit: {
          buildPayload() {
            return Promise.resolve({
              payload: null,
              reason: "no-skills",
            });
          },
        },
        githubFetch: {
          fetchRepo() {
            return Promise.resolve({
              branch: "main",
              commitDate: null,
              commitMessage: null,
              commitSha: "0123456789abcdef0123456789abcdef01234567",
              forkCount: null,
              invalidSkills: [],
              licenseInfo: null,
              nameWithOwner: "acme/skills",
              owner: "acme",
              ownerAvatarUrl: null,
              ownerHandle: "acme",
              ownerName: null,
              recentCommits: [],
              repo: "skills",
              repoCreatedAt: null,
              repoUpdatedAt: null,
              repoUrl: null,
              requestedSkillPath: null,
              skills: [],
              stargazerCount: null,
              tree: [],
            });
          },
        },
        snapshotHistory: {
          createHistoricalSnapshots() {
            return Promise.resolve(null);
          },
        },
      },
    );

    expect(context.githubHistory).toBeDefined();
    expect(context.githubHistory?.hasGithubToken()).toBe(true);
    expect(context.githubFetch).toBeDefined();
    expect(context.githubSubmit).toBeDefined();
    expect(context.snapshotHistory).toBeDefined();
  });
});
