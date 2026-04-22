/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { SkillsUploadContentPayload } from "../../types";
import { encodeRepoCursor } from "../repos/cursor";
import { aiSearch, createSkillsService, submitGithubRepoPublic, uploadSkills } from "./service";

describe("skills service", () => {
  test("maps list cursors and public skill fields using the contract shape", async () => {
    const calls: { cursor?: string; limit?: number }[] = [];
    const service = createSkillsService({
      listSkillsPageBySyncTime: async (input) => {
        calls.push({
          cursor: input?.cursor,
          limit: input?.limit,
        });

        return {
          continueCursor: encodeRepoCursor({
            id: "skill-2",
            syncTime: 456,
          }),
          isDone: false,
          page: [
            {
              description: "Widget skill",
              id: "skill-1",
              slug: "widget",
              syncTime: 123,
              title: "Widget",
            },
          ],
        };
      },
    });

    expect(
      service.list({
        cursor: encodeRepoCursor({
          id: "skill-0",
          syncTime: 100,
        }),
        limit: 10,
      }),
    ).resolves.toEqual({
      continueCursor: encodeRepoCursor({
        id: "skill-2",
        syncTime: 456,
      }),
      isDone: false,
      page: [
        {
          description: "Widget skill",
          id: "skill-1",
          slug: "widget",
          syncTime: 123,
          title: "Widget",
        },
      ],
    });

    expect(calls).toEqual([
      {
        cursor: encodeRepoCursor({
          id: "skill-0",
          syncTime: 100,
        }),
        limit: 10,
      },
    ]);
  });

  test("maps author profiles into the public author shape", async () => {
    const service = createSkillsService({
      findAuthorByHandle: async (handle) => ({
        avatarUrl: null,
        githubUrl: `https://github.com/${handle}`,
        handle,
        isVerified: 1,
        name: "Widget Author",
        repoCount: 2,
        skillCount: 3,
      }),
    });

    expect(service.getAuthorByHandle({ handle: "acme" })).resolves.toEqual({
      avatarUrl: undefined,
      githubUrl: "https://github.com/acme",
      handle: "acme",
      isVerified: true,
      name: "Widget Author",
      repoCount: 2,
      skillCount: 3,
    });
  });

  test("claims a skill when the authenticated github handle matches the repo owner", async () => {
    const claimed: { skillId: string; userId: string }[] = [];
    const service = createSkillsService({
      claimSkillById: async (input) => {
        claimed.push(input);
      },
      findSkillClaimContextBySlug: async (slug) =>
        slug === "widget"
          ? {
              claimedUserId: null,
              repoOwnerHandle: "acme",
              skillId: "skill-1",
            }
          : null,
    });

    await expect(
      service.claimAsAuthor({
        githubHandle: "  acme  ",
        slug: "widget",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      alreadyClaimed: false,
      claimed: true,
    });
    expect(claimed).toEqual([
      {
        skillId: "skill-1",
        userId: "user-1",
      },
    ]);
  });

  test("returns alreadyClaimed when the same account claims again", async () => {
    const claimed: { skillId: string; userId: string }[] = [];
    const service = createSkillsService({
      claimSkillById: async (input) => {
        claimed.push(input);
      },
      findSkillClaimContextBySlug: async () => ({
        claimedUserId: "user-1",
        repoOwnerHandle: "acme",
        skillId: "skill-1",
      }),
    });

    await expect(
      service.claimAsAuthor({
        githubHandle: "acme",
        slug: "widget",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      alreadyClaimed: true,
      claimed: true,
    });
    expect(claimed).toEqual([]);
  });

  test("rejects claims when the github handle does not match the repo owner", async () => {
    const service = createSkillsService({
      findSkillClaimContextBySlug: async () => ({
        claimedUserId: null,
        repoOwnerHandle: "acme",
        skillId: "skill-1",
      }),
    });

    await expect(
      service.claimAsAuthor({
        githubHandle: "other",
        slug: "widget",
        userId: "user-1",
      }),
    ).rejects.toThrow("Your GitHub handle does not match this skill owner.");
  });

  test("rejects claims without a linked github account", async () => {
    const service = createSkillsService();

    await expect(
      service.claimAsAuthor({
        githubHandle: null,
        slug: "widget",
        userId: "user-1",
      }),
    ).rejects.toThrow("Your account must be linked to GitHub before claiming.");
  });

  test("forwards search filters to the search repo helper", async () => {
    const calls: unknown[] = [];
    const service = createSkillsService({
      searchSkillsPageByFilters: async (input) => {
        calls.push(input);
        return {
          continueCursor: "cursor-2",
          isDone: false,
          page: [
            {
              authorHandle: "acme",
              createdAt: 1,
              description: "Widget skill",
              downloadsAllTime: 2,
              downloadsTrending: 3,
              forkCount: 4,
              id: "skill-1",
              isVerified: true,
              latestVersion: "1.0.0",
              license: "MIT",
              primaryCategory: "productivity",
              repoName: "skills",
              repoUrl: "https://github.com/acme/skills",
              slug: "widget",
              stargazerCount: 5,
              syncTime: 6,
              title: "Widget",
              updatedAt: 7,
              viewsAllTime: 8,
            },
          ],
        };
      },
    });

    await expect(
      service.search({
        authorHandle: "acme",
        categories: ["productivity"],
        cursor: "cursor-1",
        limit: 10,
        minAuditScore: 80,
        minScore: 90,
        query: "widget",
        sort: "stars",
        tags: ["featured"],
      }),
    ).resolves.toEqual({
      continueCursor: "cursor-2",
      isDone: false,
      page: [
        {
          author: {
            githubUrl: "https://github.com/acme",
            handle: "acme",
          },
          authorHandle: "acme",
          createdAt: 1,
          description: "Widget skill",
          downloadsAllTime: 2,
          downloadsTrending: 3,
          forkCount: 4,
          id: "skill-1",
          isVerified: true,
          latestVersion: "1.0.0",
          license: "MIT",
          primaryCategory: "productivity",
          repoName: "skills",
          repoUrl: "https://github.com/acme/skills",
          slug: "widget",
          stargazerCount: 5,
          syncTime: 6,
          title: "Widget",
          updatedAt: 7,
          viewsAllTime: 8,
        },
      ],
    });
    expect(calls).toEqual([
      {
        authorHandle: "acme",
        categories: ["productivity"],
        cursor: "cursor-1",
        limit: 10,
        minAuditScore: 80,
        minScore: 90,
        query: "widget",
        sort: "stars",
        tags: ["featured"],
      },
    ]);
  });

  test("resolves ai search results into the public search shape", async () => {
    const service = createSkillsService({
      findSkillByPath: async (input) =>
        input.authorHandle === "acme" && input.skillSlug === "widget"
          ? {
              authorHandle: "acme",
              createdAt: 11,
              description: "Widget skill",
              downloadsAllTime: 22,
              downloadsTrending: 33,
              forkCount: 44,
              id: "skill-1",
              isVerified: true,
              latestVersion: "1.0.0",
              license: "MIT",
              primaryCategory: "productivity",
              repoName: "skills",
              repoUrl: "https://github.com/acme/skills",
              slug: "widget",
              stargazerCount: 55,
              syncTime: 66,
              title: "Widget",
              updatedAt: 77,
              viewsAllTime: 88,
            }
          : null,
      findSkillBySlug: async () => null,
    });

    const result = await service.search(
      {
        mode: "ai",
        query: "widget",
        rewriteQuery: false,
      },
      {
        async search() {
          return {
            data: [
              {
                content: [{ text: "Widget docs" }],
                key: "acme/skills/skills/widget/skill.md",
                score: 0.9,
              },
              {
                slug: "widget",
              },
            ],
            has_more: false,
            search_query: "widget",
          };
        },
      },
    );

    expect(result.ai).toMatchObject({
      mode: "ai",
      raw: {
        resolution: {
          pathCandidatesCount: 1,
          slugCandidatesCount: 1,
        },
      },
      resolvedSkillsCount: 1,
      resultCount: 2,
    });
    expect(result.page[0]).toMatchObject({
      aiMatch: {
        itemKey: "acme/skills/skills/widget/skill.md",
        score: 0.9,
        snippet: "Widget docs",
        sourcePath: "acme/skills/skills/widget/skill.md",
      },
      authorHandle: "acme",
      createdAt: 11,
      description: "Widget skill",
      id: "skill-1",
      repoName: "skills",
      slug: "widget",
      title: "Widget",
    });
    expect(result.continueCursor).toBe("");
    expect(result.isDone).toBe(true);
  });

  test("forwards raw ai search requests to the injected runtime", async () => {
    const calls: unknown[] = [];

    await expect(
      aiSearch(
        {
          query: "widget",
          rewriteQuery: true,
        },
        {
          async search(input) {
            calls.push(input);
            return {
              data: [],
              has_more: true,
            };
          },
        },
      ),
    ).resolves.toEqual({
      data: [],
      has_more: true,
    });

    expect(calls).toEqual([
      {
        query: "widget",
        rewriteQuery: true,
      },
    ]);
  });

  test("forwards upload payloads to the workflow scheduler", async () => {
    const payload = {
      recentCommits: [{ sha: "abc123" }],
      repo: {
        createdAt: 1,
        defaultBranch: "main",
        forks: 2,
        license: "MIT",
        nameWithOwner: "example/skills",
        owner: {
          handle: "example",
        },
        stars: 3,
        updatedAt: 4,
      },
      skills: [
        {
          description: "Example skill",
          directoryPath: "skills/example",
          entryPath: "skills/example/skill.md",
          initialSnapshot: {
            files: [{ content: "hello", path: "skills/example/skill.md" }],
            sourceCommitDate: 1,
            sourceCommitSha: "abc123",
            sourceRef: "main",
            tree: [{ path: "skills/example/skill.md", sha: "abc123", type: "blob" as const }],
          },
          slug: "example-skill",
          sourceLocator: "github:example/skills/skills/example/skill.md",
          sourceType: "github" as const,
          title: "Example skill",
        },
      ],
    };

    const scheduled: SkillsUploadContentPayload[] = [];
    const result = await uploadSkills(payload, {
      enqueue: async (input) => {
        scheduled.push(input);
        return { workId: "workflow-1" };
      },
    });

    expect(result).toEqual({
      ids: [],
      workId: "workflow-1",
    });
    expect(scheduled).toEqual([payload]);
  });

  test("runs the upload pipeline with the injected runtime boundaries", async () => {
    const calls: {
      createSkill?: unknown;
      createSnapshot?: unknown;
      deprecateSnapshotsBeyondLimit?: unknown;
      ensureRepo?: unknown;
      setSkillLatestSnapshot?: unknown;
      syncSkillTags?: unknown;
      uploadSnapshotFiles?: unknown;
    }[] = [];
    const scheduledTagging: unknown[] = [];
    const scheduledSnapshotHistory: unknown[] = [];

    const service = createSkillsService({
      checkSkillExistingBySlug: async () => false,
      createSkill: async (input) => {
        calls.push({ createSkill: input });
        return "skill-1";
      },
      createSnapshot: async (input) => {
        calls.push({ createSnapshot: input });
        return "snapshot-1";
      },
      deprecateSnapshotsBeyondLimit: async (input) => {
        calls.push({ deprecateSnapshotsBeyondLimit: input });
      },
      ensureRepo: async (input) => {
        calls.push({ ensureRepo: input });
        return "repo-1";
      },
      setSkillLatestSnapshot: async (input) => {
        calls.push({ setSkillLatestSnapshot: input });
      },
      syncSkillTags: async (input) => {
        calls.push({ syncSkillTags: input });
      },
      uploadSnapshotFiles: async (input) => {
        calls.push({ uploadSnapshotFiles: input });
        return { workId: "snapshot-upload-1" };
      },
    });

    const result = await service.runUploadSkillsPipeline(
      {
        recentCommits: [
          {
            sha: "head",
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
                  type: "blob" as const,
                },
              ],
            },
            slug: "widget",
            sourceLocator: "github:acme/skills/skills/acme/widget/skill.md",
            sourceType: "github" as const,
            tags: ["AI Tools"],
            title: "Widget",
          },
        ],
      },
      {
        scheduleSkillsTagging: {
          enqueue: async (input) => {
            scheduledTagging.push(input);
            return { workId: "tagging-1" };
          },
        },
        snapshotHistory: {
          createHistoricalSnapshots: async (input) => {
            scheduledSnapshotHistory.push(input);
            return null;
          },
        },
        snapshotUploadScheduler: {
          enqueue: async () => ({ workId: "snapshot-upload-1" }),
        },
      },
    );

    expect(result).toEqual({
      ids: ["skill-1"],
      workId: "snapshot-upload-1",
    });
    expect(scheduledTagging).toEqual([
      {
        skillIds: ["skill-1"],
        triggerCategorizationAfterTagging: true,
      },
    ]);
    expect(scheduledSnapshotHistory).toHaveLength(0);
    expect(calls).toEqual([
      {
        ensureRepo: {
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
      },
      {
        createSkill: {
          categoryId: null,
          description: "Widget skill",
          repoId: "repo-1",
          slug: "widget",
          syncTime: expect.any(Number),
          title: "Widget",
          userId: null,
          visibility: "public",
        },
      },
      {
        createSnapshot: {
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
      },
      {
        uploadSnapshotFiles: {
          files: [
            {
              content: "---\nname: widget\n---\n# Widget",
              path: "skills/acme/widget/skill.md",
            },
          ],
          snapshotId: "snapshot-1",
        },
      },
      {
        setSkillLatestSnapshot: {
          latestCommitDate: 1,
          latestCommitMessage: "feat: add widget",
          latestCommitSha: "commit-1",
          latestCommitUrl: "https://github.com/acme/skills/commit/commit-1",
          skillId: "skill-1",
          snapshotId: "snapshot-1",
          syncTime: expect.any(Number),
        },
      },
      {
        syncSkillTags: {
          skillId: "skill-1",
          tags: ["ai-tools"],
        },
      },
      {
        deprecateSnapshotsBeyondLimit: {
          keepLatest: 3,
          skillId: "skill-1",
        },
      },
    ]);
  });

  test("submits a public github repo by building a payload and scheduling upload", async () => {
    const submitted: {
      input: unknown;
      payload: unknown;
    }[] = [];

    const result = await submitGithubRepoPublic(
      { owner: "example", repo: "skills" },
      {
        buildPayload: async (input) => {
          submitted.push({
            input,
            payload: null,
          });
          return {
            payload: {
              recentCommits: [{ sha: "abc123" }],
              repo: {
                createdAt: 1,
                defaultBranch: "main",
                forks: 2,
                license: "MIT",
                nameWithOwner: "example/skills",
                owner: {
                  handle: "example",
                },
                stars: 3,
                updatedAt: 4,
              },
              skills: [
                {
                  description: "Example skill",
                  directoryPath: "skills/example",
                  entryPath: "skills/example/skill.md",
                  initialSnapshot: {
                    files: [{ content: "hello", path: "skills/example/skill.md" }],
                    sourceCommitDate: 1,
                    sourceCommitSha: "abc123",
                    sourceRef: "main",
                    tree: [
                      { path: "skills/example/skill.md", sha: "abc123", type: "blob" as const },
                    ],
                  },
                  slug: "example-skill",
                  sourceLocator: "github:example/skills/skills/example/skill.md",
                  sourceType: "github" as const,
                  title: "Example skill",
                },
              ],
            },
          };
        },
      },
      {
        enqueue: async (input) => {
          submitted.push({
            input: null,
            payload: input,
          });
          return { workId: "workflow-1" };
        },
      },
    );

    expect(result).toEqual({
      skillsCount: 1,
      status: "submitted",
      workflowId: "workflow-1",
    });
    expect(submitted).toHaveLength(2);
  });

  test("submits only the selected github skill roots", async () => {
    const scheduledPayloads: SkillsUploadContentPayload[] = [];

    const result = await submitGithubRepoPublic(
      {
        owner: "example",
        repo: "skills",
        skillRootPaths: ["skills/selected"],
      },
      {
        buildPayload: async () => ({
          payload: {
            skills: [
              {
                description: "Selected skill",
                directoryPath: "skills/selected/",
                entryPath: "skills/selected/skill.md",
                initialSnapshot: {
                  files: [{ content: "selected", path: "skills/selected/skill.md" }],
                  sourceCommitDate: 1,
                  sourceCommitSha: "sha-selected",
                  sourceRef: "main",
                  tree: [{ path: "skills/selected/skill.md", sha: "sha-selected", type: "blob" }],
                },
                slug: "selected",
                sourceLocator: "github:example/skills/skills/selected/skill.md",
                sourceType: "github",
                title: "Selected",
              },
              {
                description: "Ignored skill",
                directoryPath: "skills/ignored/",
                entryPath: "skills/ignored/skill.md",
                initialSnapshot: {
                  files: [{ content: "ignored", path: "skills/ignored/skill.md" }],
                  sourceCommitDate: 1,
                  sourceCommitSha: "sha-ignored",
                  sourceRef: "main",
                  tree: [{ path: "skills/ignored/skill.md", sha: "sha-ignored", type: "blob" }],
                },
                slug: "ignored",
                sourceLocator: "github:example/skills/skills/ignored/skill.md",
                sourceType: "github",
                title: "Ignored",
              },
            ],
          },
        }),
      },
      {
        enqueue: async (input) => {
          scheduledPayloads.push(input);
          return { workId: "workflow-selected" };
        },
      },
    );

    expect(result).toEqual({
      skillsCount: 1,
      status: "submitted",
      workflowId: "workflow-selected",
    });
    expect(scheduledPayloads).toHaveLength(1);
    expect(scheduledPayloads[0]?.skills.map((skill) => skill.slug)).toEqual(["selected"]);
  });

  test("returns snapshot history info for the requested skills", async () => {
    const calls: string[][] = [];
    const service = createSkillsService({
      listSkillsHistoryInfoByIds: async (skillIds) => {
        calls.push(skillIds);
        return [
          {
            directoryPath: "skills/example",
            entryPath: "skill.md",
            id: "skill-1",
            latestDescription: "Example skill",
            latestName: "Example",
            latestVersion: "1.0.0",
          },
        ];
      },
    });

    await expect(service.getSkillsHistoryInfo({ skillIds: ["skill-1"] })).resolves.toEqual([
      {
        directoryPath: "skills/example",
        entryPath: "skill.md",
        id: "skill-1",
        latestDescription: "Example skill",
        latestName: "Example",
        latestVersion: "1.0.0",
      },
    ]);

    expect(calls).toEqual([["skill-1"]]);
  });

  test("normalizes nullable snapshot versions when returning history info", async () => {
    const service = createSkillsService({
      listSkillsHistoryInfoByIds: async () => [
        {
          directoryPath: "skills/example",
          entryPath: "skill.md",
          id: "skill-1",
          latestDescription: "Example skill",
          latestName: "Example",
          latestVersion: null,
        },
      ],
    });

    await expect(service.getSkillsHistoryInfo({ skillIds: ["skill-1"] })).resolves.toEqual([
      {
        directoryPath: "skills/example",
        entryPath: "skill.md",
        id: "skill-1",
        latestDescription: "Example skill",
        latestName: "Example",
        latestVersion: undefined,
      },
    ]);
  });
});
