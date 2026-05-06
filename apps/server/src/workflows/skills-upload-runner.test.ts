/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runSkillsUploadWorkflow } from "./skills-upload-runner";
import { createWorkflowStepStub } from "./test-support";

describe("runSkillsUploadWorkflow", () => {
  test("runs the upload pipeline as separate workflow steps", async () => {
    const stepNames: string[] = [];
    const calls = {
      aiSearchItemUpload: [] as unknown[],
      aiSearchItemUpdate: [] as unknown[],
      createHistoricalSnapshots: [] as unknown[],
      createSkill: [] as unknown[],
      createSnapshot: [] as unknown[],
      deprecateSnapshotsBeyondLimit: [] as unknown[],
      ensureRepo: [] as unknown[],
      scheduleSkillsTagging: [] as unknown[],
      setSkillLatestSnapshot: [] as unknown[],
      syncSkillTags: [] as unknown[],
      uploadSnapshotFiles: [] as unknown[],
    };

    const result = await runSkillsUploadWorkflow(
      {
        payload: {
          recentCommits: [
            {
              sha: "head",
            },
            {
              sha: "parent",
            },
          ],
          repo: {
            createdAt: 1,
            defaultBranch: "main",
            forks: 1,
            license: "MIT",
            nameWithOwner: "acme/skills",
            owner: {
              handle: "acme",
            },
            stars: 2,
            updatedAt: 2,
          },
          skills: [
            {
              description: "Widget skill",
              directoryPath: "skills/acme/widget",
              entryPath: "skills/acme/widget/skill.md",
              initialSnapshot: {
                files: [
                  {
                    content: "---\nname: widget\n---\n# Widget",
                    path: "skills/acme/widget/skill.md",
                  },
                ],
                sourceCommitDate: 1,
                sourceCommitMessage: "feat: add widget",
                sourceCommitSha: "commit-1",
                sourceCommitUrl: "https://github.com/acme/skills/commit/commit-1",
                sourceRef: "main",
                tree: [
                  {
                    path: "skills/acme/widget/skill.md",
                    sha: "sha-1",
                    type: "blob",
                  },
                ],
              },
              slug: "widget",
              sourceLocator: "github:acme/skills/skills/acme/widget/skill.md",
              sourceType: "github",
              tags: ["AI Tools"],
              title: "Widget",
            },
          ],
        },
      } as never,
      createWorkflowStepStub({
        onDo: (name) => {
          stepNames.push(name);
        },
      }) as never,
      {
        aiSearchItems: {
          deleteItem: (_itemId: string) => Promise.resolve(),
          uploadItem: (key: string, content: string, metadata: Record<string, string>) => {
            calls.aiSearchItemUpload.push({ content, key, metadata });
            return Promise.resolve({ id: "ai-search-1" });
          },
        },
        checkSkillExistingBySlug: (_slug: string) => Promise.resolve(false),
        createSkill: (input: unknown) => {
          calls.createSkill.push(input);
          return Promise.resolve("skill-1");
        },
        createSnapshot: (input: unknown) => {
          calls.createSnapshot.push(input);
          return Promise.resolve("snapshot-1");
        },
        deprecateSnapshotsBeyondLimit: (input: unknown) => {
          calls.deprecateSnapshotsBeyondLimit.push(input);
          return Promise.resolve();
        },
        ensureRepo: (input: unknown) => {
          calls.ensureRepo.push(input);
          return Promise.resolve("repo-1");
        },
        scheduleSkillsTagging: {
          enqueue: (input: unknown) => {
            calls.scheduleSkillsTagging.push(input);
            return Promise.resolve({ workId: "tagging-1" });
          },
        },
        setSkillLatestSnapshot: (input: unknown) => {
          calls.setSkillLatestSnapshot.push(input);
          return Promise.resolve();
        },
        snapshotHistory: {
          createHistoricalSnapshots: (input: unknown) => {
            calls.createHistoricalSnapshots.push(input);
            return Promise.resolve(null);
          },
        },
        snapshotUploadScheduler: {
          enqueue: () => Promise.resolve({ workId: "snapshot-upload-1" }),
        },
        syncSkillTags: (input: unknown) => {
          calls.syncSkillTags.push(input);
          return Promise.resolve(null);
        },
        updateSkillAiSearchItemId: (input: unknown) => {
          calls.aiSearchItemUpdate.push(input);
          return Promise.resolve();
        },
        uploadSnapshotFiles: (input: unknown) => {
          calls.uploadSnapshotFiles.push(input);
          return Promise.resolve({ workId: "snapshot-upload-1" });
        },
      } as never,
    );

    expect(stepNames).toEqual([
      "load-upload-payload",
      "prepare-upload-skills",
      "ensure-upload-repo",
      "resolve-upload-skill-slug-0",
      "create-upload-skill-0",
      "create-upload-snapshot-0",
      "upload-skill-snapshot-files-0",
      "set-upload-skill-latest-snapshot-0",
      "sync-upload-skill-tags-0",
      "deprecate-upload-skill-snapshots-0",
      "upload-skill-ai-search-0",
      "link-skill-ai-search-0",
      "schedule-upload-skill-tagging-0",
      "create-upload-historical-snapshots",
      "cleanup-staging",
    ]);
    expect(result).toEqual({
      ids: ["skill-1"],
      workId: "snapshot-upload-1",
    });
    expect(calls.ensureRepo).toEqual([
      {
        createdAt: 1,
        defaultBranch: "main",
        forks: 1,
        license: "MIT",
        nameWithOwner: "acme/skills",
        owner: {
          avatarUrl: null,
          handle: "acme",
          name: null,
        },
        stars: 2,
        updatedAt: 2,
      },
    ]);
    expect(calls.createSkill).toEqual([
      {
        description: "Widget skill",
        repoId: "repo-1",
        slug: "widget",
        syncTime: expect.any(Number),
        title: "Widget",
        userId: null,
        visibility: "public",
      },
    ]);
    expect(calls.createSnapshot).toEqual([
      {
        description: "Widget skill",
        directoryPath: "skills/acme/widget",
        entryPath: "skills/acme/widget/skill.md",
        frontmatterHash: null,
        hash: expect.any(String),
        name: "Widget",
        skillContentHash: null,
        skillId: "skill-1",
        sourceCommitDate: 1,
        sourceCommitMessage: "feat: add widget",
        sourceCommitSha: "commit-1",
        sourceCommitUrl: "https://github.com/acme/skills/commit/commit-1",
        syncTime: expect.any(Number),
        version: "0.0.1",
      },
    ]);
    expect(calls.uploadSnapshotFiles).toEqual([
      {
        files: [
          {
            content: "---\nname: widget\n---\n# Widget",
            path: "skills/acme/widget/skill.md",
          },
        ],
        snapshotId: "snapshot-1",
      },
    ]);
    expect(calls.setSkillLatestSnapshot).toEqual([
      {
        latestCommitDate: 1,
        latestCommitMessage: "feat: add widget",
        latestCommitSha: "commit-1",
        latestCommitUrl: "https://github.com/acme/skills/commit/commit-1",
        skillId: "skill-1",
        snapshotId: "snapshot-1",
        syncTime: expect.any(Number),
      },
    ]);
    expect(calls.syncSkillTags).toEqual([
      {
        skillId: "skill-1",
        tags: ["ai-tools"],
      },
    ]);
    expect(calls.deprecateSnapshotsBeyondLimit).toEqual([
      {
        keepLatest: 3,
        skillId: "skill-1",
      },
    ]);
    expect(calls.aiSearchItemUpload).toEqual([
      {
        content: "---\nname: widget\n---\n# Widget",
        key: "skill-1.md",
        metadata: {
          authorHandle: "acme",
          repoName: "skills",
          skillId: "skill-1",
          skillSlug: "widget",
          version: "0.0.1",
        },
      },
    ]);
    expect(calls.aiSearchItemUpdate).toEqual([
      {
        aiSearchItemId: "ai-search-1",
        skillId: "skill-1",
      },
    ]);
    expect(calls.scheduleSkillsTagging).toEqual([
      {
        skillIds: ["skill-1"],
        triggerCategorizationAfterTagging: true,
      },
    ]);
    expect(calls.createHistoricalSnapshots).toEqual([
      {
        commits: [
          {
            sha: "head",
          },
          {
            sha: "parent",
          },
        ],
        repoName: "skills",
        repoOwner: "acme",
        skillIds: ["skill-1"],
      },
    ]);
  });
});
