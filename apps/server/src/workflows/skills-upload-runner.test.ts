/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { runSkillsUploadWorkflow } from "./skills-upload-runner";
import { stageSkillsUploadPayload } from "./skills-upload";
import { createWorkflowStepStub } from "./test-support";

describe("runSkillsUploadWorkflow", () => {
  test("runs the upload pipeline as separate workflow steps", async () => {
    const stepNames: string[] = [];
    const storage = new Map<string, string>();
    const calls = {
      aiSearchItemUpload: [] as unknown[],
      aiSearchItemUpdate: [] as unknown[],
      createHistoricalSnapshots: [] as unknown[],
      createSkill: [] as unknown[],
      createSnapshot: [] as unknown[],
      deprecateSnapshotsBeyondLimit: [] as unknown[],
      ensureRepo: [] as unknown[],
      dispatchStaticAuditWorkflow: [] as unknown[],
      runUploadSnapshotFilesPipeline: [] as unknown[],
      scheduleSkillsTagging: [] as unknown[],
      setSkillLatestSnapshot: [] as unknown[],
      syncSkillTags: [] as unknown[],
      uploadSnapshotFiles: [] as unknown[],
    };
    const bucket = {
      delete(key: string) {
        storage.delete(key);
        return Promise.resolve();
      },
      get(key: string) {
        const value = storage.get(key);
        return Promise.resolve(
          value
            ? {
                text: () => Promise.resolve(value),
              }
            : null,
        );
      },
      put(key: string, value: string) {
        storage.set(key, value);
        return Promise.resolve({});
      },
    };

    const stagedPayload = await stageSkillsUploadPayload(bucket, {
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
          entryPath: "skills/acme/widget/SKILL.md",
          initialSnapshot: {
            files: [
              {
                content: "---\nname: widget\ndescription: Widget skill\n---\n# Widget",
                path: "skills/acme/widget/SKILL.md",
              },
            ],
            sourceCommitDate: 1,
            sourceCommitMessage: "feat: add widget",
            sourceCommitSha: "commit-1",
            sourceCommitUrl: "https://github.com/acme/skills/commit/commit-1",
            sourceRef: "main",
            tree: [
              {
                path: "skills/acme/widget/SKILL.md",
                sha: "sha-1",
                type: "blob",
              },
            ],
          },
          slug: "widget",
          sourceLocator: "github:acme/skills/skills/acme/widget/SKILL.md",
          sourceType: "github",
          tags: ["AI Tools"],
          title: "Widget",
        },
      ],
    });

    const result = await runSkillsUploadWorkflow(
      {
        payload: stagedPayload,
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
        findSnapshotByContentHashes: () => Promise.resolve(null),
        deprecateSnapshotsBeyondLimit: (input: unknown) => {
          calls.deprecateSnapshotsBeyondLimit.push(input);
          return Promise.resolve();
        },
        ensureRepo: (input: unknown) => {
          calls.ensureRepo.push(input);
          return Promise.resolve("repo-1");
        },
        listRepoSkillSnapshotHeadsByRepoId: () => Promise.resolve([]),
        dispatchStaticAuditWorkflow: (targets: unknown) => {
          calls.dispatchStaticAuditWorkflow.push(targets);
          return Promise.resolve({
            dispatched: true as const,
            repository: "acme/skills-audit",
            workflowFile: "skill-audit-submit.yml",
          });
        },
        runUploadSnapshotFilesPipeline: (input: unknown) => {
          calls.runUploadSnapshotFilesPipeline.push(input);
          return Promise.resolve({
            filesCount: 1,
            snapshotId: "snapshot-1",
            workId: "snapshot-upload-1",
          });
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
        snapshotFilesBucket: bucket,
      } as never,
    );

    expect(stepNames).toEqual([
      "ensure-upload-repo",
      "list-existing-upload-repo-skills",
      "check-duplicate-content-0",
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
      "dispatch-static-audit",
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
        entryPath: "skills/acme/widget/SKILL.md",
        frontmatterHash: expect.any(String),
        hash: expect.any(String),
        name: "Widget",
        skillContentHash: expect.any(String),
        skillId: "skill-1",
        sourceCommitDate: 1,
        sourceCommitMessage: "feat: add widget",
        sourceCommitSha: "commit-1",
        sourceCommitUrl: "https://github.com/acme/skills/commit/commit-1",
        syncTime: expect.any(Number),
        version: "1.0.0",
      },
    ]);
    expect(calls.uploadSnapshotFiles).toEqual([]);
    expect(calls.runUploadSnapshotFilesPipeline).toEqual([
      {
        files: [
          {
            content: "---\nname: widget\ndescription: Widget skill\n---\n# Widget",
            path: "skills/acme/widget/SKILL.md",
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
        version: "1.0.0",
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
        content: "---\nname: widget\ndescription: Widget skill\n---\n# Widget",
        key: "skill-1.md",
        metadata: {
          authorHandle: "acme",
          repoName: "skills",
          skillId: "skill-1",
          skillSlug: "widget",
          version: "1.0.0",
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
    expect(calls.dispatchStaticAuditWorkflow).toEqual([
      [
        {
          owner: "acme",
          repo: "skills",
          skillRootPath: "skills/acme/widget",
          snapshotId: "snapshot-1",
          sourceCommitSha: "commit-1",
          sourceRef: "main",
        },
      ],
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

  test("keeps ai search linking failures non-blocking", async () => {
    const storage = new Map<string, string>();
    const bucket = {
      delete(key: string) {
        storage.delete(key);
        return Promise.resolve();
      },
      get(key: string) {
        const value = storage.get(key);
        return Promise.resolve(
          value
            ? {
                text: () => Promise.resolve(value),
              }
            : null,
        );
      },
      put(key: string, value: string) {
        storage.set(key, value);
        return Promise.resolve({});
      },
    };

    const stagedPayload = await stageSkillsUploadPayload(bucket, {
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
          entryPath: "skills/acme/widget/SKILL.md",
          initialSnapshot: {
            files: [
              {
                content: "---\nname: widget\ndescription: Widget skill\n---\n# Widget",
                path: "skills/acme/widget/SKILL.md",
              },
            ],
            sourceCommitDate: 1,
            sourceCommitSha: "commit-1",
            sourceRef: "main",
            tree: [
              {
                path: "skills/acme/widget/SKILL.md",
                sha: "sha-1",
                type: "blob",
              },
            ],
          },
          slug: "widget",
          sourceLocator: "github:acme/skills/skills/acme/widget/SKILL.md",
          sourceType: "github",
          title: "Widget",
        },
      ],
    });

    const result = await runSkillsUploadWorkflow(
      {
        payload: stagedPayload,
      } as never,
      createWorkflowStepStub() as never,
      {
        aiSearchItems: {
          deleteItem: (_itemId: string) => Promise.resolve(),
          uploadItem: (_key: string, _content: string, _metadata: Record<string, string>) =>
            Promise.resolve({ id: "ai-search-1" }),
        },
        checkSkillExistingBySlug: () => Promise.resolve(false),
        createSkill: () => Promise.resolve("skill-1"),
        createSnapshot: () => Promise.resolve("snapshot-1"),
        findSnapshotByContentHashes: () => Promise.resolve(null),
        deprecateSnapshotsBeyondLimit: () => Promise.resolve(),
        ensureRepo: () => Promise.resolve("repo-1"),
        listRepoSkillSnapshotHeadsByRepoId: () => Promise.resolve([]),
        scheduleSkillsTagging: {
          enqueue: () => Promise.resolve({ workId: "tagging-1" }),
        },
        setSkillLatestSnapshot: () => Promise.resolve(),
        syncSkillTags: () => Promise.resolve([]),
        updateSkillAiSearchItemId: () => Promise.reject(new Error("transient db failure")),
        dispatchStaticAuditWorkflow: () =>
          Promise.resolve({
            dispatched: true as const,
            repository: "acme/skills-audit",
            workflowFile: "skill-audit-submit.yml",
          }),
        uploadSnapshotFiles: () => Promise.resolve({ workId: "snapshot-upload-1" }),
        snapshotFilesBucket: bucket,
      } as never,
    );

    expect(result).toEqual({
      ids: ["skill-1"],
      workId: "snapshot-upload-1",
    });
  });

  test("prefers the declared entry path for ai search file selection", async () => {
    const aiSearchUploads: { content: string; key: string }[] = [];
    const storage = new Map<string, string>();
    const bucket = {
      delete(key: string) {
        storage.delete(key);
        return Promise.resolve();
      },
      get(key: string) {
        const value = storage.get(key);
        return Promise.resolve(
          value
            ? {
                text: () => Promise.resolve(value),
              }
            : null,
        );
      },
      put(key: string, value: string) {
        storage.set(key, value);
        return Promise.resolve({});
      },
    };

    const stagedPayload = await stageSkillsUploadPayload(bucket, {
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
          entryPath: "skills/acme/widget/docs/SKILL.md",
          initialSnapshot: {
            files: [
              {
                content: "---\nname: wrong\ndescription: Wrong file\n---\n# Wrong file",
                path: "skills/acme/widget/SKILL.md",
              },
              {
                content: "---\nname: right\ndescription: Right file\n---\n# Right file",
                path: "skills/acme/widget/docs/SKILL.md",
              },
            ],
            sourceCommitDate: 1,
            sourceCommitSha: "commit-1",
            sourceRef: "main",
            tree: [
              {
                path: "skills/acme/widget/docs/SKILL.md",
                sha: "sha-1",
                type: "blob",
              },
            ],
          },
          slug: "widget",
          sourceLocator: "github:acme/skills/skills/acme/widget/docs/SKILL.md",
          sourceType: "github",
          title: "Widget",
        },
      ],
    });

    await runSkillsUploadWorkflow(
      {
        payload: stagedPayload,
      } as never,
      createWorkflowStepStub() as never,
      {
        aiSearchItems: {
          deleteItem: (_itemId: string) => Promise.resolve(),
          uploadItem: (key: string, content: string) => {
            aiSearchUploads.push({ content, key });
            return Promise.resolve({ id: "ai-search-1" });
          },
        },
        checkSkillExistingBySlug: () => Promise.resolve(false),
        createSkill: () => Promise.resolve("skill-1"),
        createSnapshot: () => Promise.resolve("snapshot-1"),
        findSnapshotByContentHashes: () => Promise.resolve(null),
        deprecateSnapshotsBeyondLimit: () => Promise.resolve(),
        ensureRepo: () => Promise.resolve("repo-1"),
        listRepoSkillSnapshotHeadsByRepoId: () => Promise.resolve([]),
        scheduleSkillsTagging: {
          enqueue: () => Promise.resolve({ workId: "tagging-1" }),
        },
        setSkillLatestSnapshot: () => Promise.resolve(),
        syncSkillTags: () => Promise.resolve([]),
        updateSkillAiSearchItemId: () => Promise.resolve(),
        dispatchStaticAuditWorkflow: () =>
          Promise.resolve({
            dispatched: true as const,
            repository: "acme/skills-audit",
            workflowFile: "skill-audit-submit.yml",
          }),
        uploadSnapshotFiles: () => Promise.resolve({ workId: "snapshot-upload-1" }),
        snapshotFilesBucket: bucket,
      } as never,
    );

    expect(aiSearchUploads).toEqual([
      {
        content: "---\nname: right\ndescription: Right file\n---\n# Right file",
        key: "skill-1.md",
      },
    ]);
  });

  test("reuses an existing repo skill at the same directory path instead of creating a duplicate slug", async () => {
    const stepNames: string[] = [];
    const storage = new Map<string, string>();
    const calls = {
      createSkill: [] as unknown[],
      createSnapshot: [] as unknown[],
      setSkillLatestSnapshot: [] as unknown[],
      syncSkillTags: [] as unknown[],
    };
    const bucket = {
      delete(key: string) {
        storage.delete(key);
        return Promise.resolve();
      },
      get(key: string) {
        const value = storage.get(key);
        return Promise.resolve(
          value
            ? {
                text: () => Promise.resolve(value),
              }
            : null,
        );
      },
      put(key: string, value: string) {
        storage.set(key, value);
        return Promise.resolve({});
      },
    };

    const stagedPayload = await stageSkillsUploadPayload(bucket, {
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
          directoryPath: "skills/acme/widget/",
          entryPath: "skills/acme/widget/SKILL.md",
          initialSnapshot: {
            files: [
              {
                content: "---\nname: widget\ndescription: Widget skill\n---\n# Widget",
                path: "skills/acme/widget/SKILL.md",
              },
            ],
            sourceCommitDate: 1,
            sourceCommitSha: "commit-1",
            sourceRef: "main",
            tree: [
              {
                path: "skills/acme/widget/SKILL.md",
                sha: "sha-1",
                type: "blob",
              },
            ],
          },
          slug: "widget",
          sourceLocator: "github:acme/skills/skills/acme/widget/SKILL.md",
          sourceType: "github",
          title: "Widget",
        },
      ],
    });

    const result = await runSkillsUploadWorkflow(
      {
        payload: stagedPayload,
      } as never,
      createWorkflowStepStub({
        onDo: (name) => {
          stepNames.push(name);
        },
      }) as never,
      {
        aiSearchItems: {
          deleteItem: (_itemId: string) => Promise.resolve(),
          uploadItem: () => Promise.resolve({ id: "ai-search-existing" }),
        },
        checkSkillExistingBySlug: () => Promise.resolve(true),
        createSkill: (input: unknown) => {
          calls.createSkill.push(input);
          return Promise.resolve("skill-should-not-be-created");
        },
        createSnapshot: (input: unknown) => {
          calls.createSnapshot.push(input);
          return Promise.resolve("snapshot-existing-2");
        },
        findSnapshotByContentHashes: () => Promise.resolve(null),
        deprecateSnapshotsBeyondLimit: () => Promise.resolve(),
        ensureRepo: () => Promise.resolve("repo-1"),
        listRepoSkillSnapshotHeadsByRepoId: () =>
          Promise.resolve([
            {
              directoryPath: "skills/acme/widget",
              entryPath: "skills/acme/widget/SKILL.md",
              latestDescription: "Old widget skill",
              latestHash: "old-hash",
              latestName: "Widget",
              latestSnapshotId: "snapshot-existing-1",
              latestSourceCommitSha: "old-commit",
              latestVersion: "1.0.0",
              skillId: "skill-existing",
              slug: "widget",
            },
          ]),
        scheduleSkillsTagging: {
          enqueue: () => Promise.resolve({ workId: "tagging-existing" }),
        },
        setSkillLatestSnapshot: (input: unknown) => {
          calls.setSkillLatestSnapshot.push(input);
          return Promise.resolve();
        },
        syncSkillTags: (input: unknown) => {
          calls.syncSkillTags.push(input);
          return Promise.resolve([]);
        },
        updateSkillAiSearchItemId: () => Promise.resolve(),
        dispatchStaticAuditWorkflow: () =>
          Promise.resolve({
            dispatched: true as const,
            repository: "acme/skills-audit",
            workflowFile: "skill-audit-submit.yml",
          }),
        uploadSnapshotFiles: () => Promise.resolve({ workId: "snapshot-upload-existing" }),
        snapshotFilesBucket: bucket,
      } as never,
    );

    expect(stepNames).toEqual([
      "ensure-upload-repo",
      "list-existing-upload-repo-skills",
      "check-duplicate-content-0",
      "create-upload-snapshot-0",
      "upload-skill-snapshot-files-0",
      "set-upload-skill-latest-snapshot-0",
      "sync-upload-skill-tags-0",
      "deprecate-upload-skill-snapshots-0",
      "upload-skill-ai-search-0",
      "link-skill-ai-search-0",
      "schedule-upload-skill-tagging-0",
      "dispatch-static-audit",
      "cleanup-staging",
    ]);
    expect(calls.createSkill).toEqual([]);
    expect(calls.createSnapshot).toEqual([
      expect.objectContaining({
        directoryPath: "skills/acme/widget",
        skillId: "skill-existing",
      }),
    ]);
    expect(calls.setSkillLatestSnapshot).toEqual([
      expect.objectContaining({
        skillId: "skill-existing",
        snapshotId: "snapshot-existing-2",
      }),
    ]);
    expect(calls.syncSkillTags).toEqual([
      {
        skillId: "skill-existing",
        tags: [],
      },
    ]);
    expect(result).toEqual({
      ids: ["skill-existing"],
      workId: "snapshot-upload-existing",
    });
  });
});
