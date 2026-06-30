/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  fetchSkillChangelog,
  fetchSkillEvalSandboxInitial,
  fetchSkillEvalRunDetail,
  fetchSkillDocument,
  fetchSkillDocumentByResolvedSkill,
  fetchSkillFileContent,
  fetchSkillCheckSaved,
  fetchSkillVersionHistory,
  fetchSkillsBrowseInitialPage,
  fetchSkillsBrowseMeta,
  fetchSkillsBrowsePagination,
  fetchSkillsSearch,
  normalizeSkillsBrowseFilters,
  saveSkillToDashboard,
  resolveSkillBase,
  resolveSnapshot,
  unsaveSkillFromDashboard,
} from "./skills.server";

type ResolveSkillBaseClient = Parameters<typeof resolveSkillBase>[0]["client"];
type FetchSkillChangelogClient = Parameters<typeof fetchSkillChangelog>[0]["client"];
type FetchSkillEvalSandboxInitialClient = Parameters<
  typeof fetchSkillEvalSandboxInitial
>[0]["client"];
type FetchSkillEvalRunDetailClient = Parameters<typeof fetchSkillEvalRunDetail>[0]["client"];
type FetchSkillDocumentClient = Parameters<typeof fetchSkillDocument>[0]["client"];
type FetchSkillVersionHistoryClient = Parameters<typeof fetchSkillVersionHistory>[0]["client"];
type FetchSkillFileContentClient = Parameters<typeof fetchSkillFileContent>[0]["client"];
type FetchSkillCheckSavedClient = Parameters<typeof fetchSkillCheckSaved>[0]["client"];
type SaveSkillClient = Parameters<typeof saveSkillToDashboard>[0]["client"];
type UnsaveSkillClient = Parameters<typeof unsaveSkillFromDashboard>[0]["client"];

type SkillsBrowseMetaClient = Parameters<typeof fetchSkillsBrowseMeta>[0]["client"];
type SkillsBrowsePaginationClient = Parameters<typeof fetchSkillsBrowsePagination>[0]["client"];
type SkillsSearchClient = Parameters<typeof fetchSkillsSearch>[0]["client"];

describe("normalizeSkillsBrowseFilters", () => {
  test("trims inputs, deduplicates tags, and falls back to the default sort", () => {
    expect(
      normalizeSkillsBrowseFilters({
        category: "  operations-automation  ",
        q: "  workflow  ",
        tag: [" workflow ", "ops", "workflow", " "],
      }),
    ).toEqual({
      activeClass: "operations-automation",
      query: "workflow",
      sort: "newest",
      tags: ["ops", "workflow"],
    });
  });
});

describe("fetchSkillsBrowseMeta", () => {
  test("loads the browse counts and taxonomy through the injected client", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      categories: {
        list: (input?: { all?: boolean; limit?: number }) => {
          calls.push({ categories: input ?? {} });
          return Promise.resolve([
            {
              count: 2,
              id: "cat-1",
              name: "Automation",
              slug: "operations-automation",
            },
          ]);
        },
      },
      metrics: {
        dailySkillsSnapshots: (input?: { limit?: number }) => {
          calls.push({ metrics: input ?? {} });
          return Promise.resolve([
            {
              day: "2024-01-01",
              newSkills: 3,
              newSnapshots: 1,
              updatedAtMs: 1710000000000,
            },
          ]);
        },
      },
      skills: {
        count: () => {
          calls.push({ skillsCount: true });
          return Promise.resolve(99);
        },
      },
      tags: {
        listIndexable: (input?: { limit?: number }) => {
          calls.push({ tags: input ?? {} });
          return Promise.resolve([
            {
              count: 5,
              id: "tag-1",
              slug: "workflow",
            },
          ]);
        },
      },
    } satisfies SkillsBrowseMetaClient;

    expect(
      fetchSkillsBrowseMeta({
        category: "  operations-automation  ",
        client,
        q: "  automation  ",
        sort: undefined,
        tag: [" workflow ", "workflow", "ops"],
      }),
    ).resolves.toEqual({
      categories: [
        {
          count: 2,
          id: "cat-1",
          name: "Automation",
          slug: "operations-automation",
        },
      ],
      counts: {
        activeFilters: 3,
        categories: 1,
        newSkills30d: 3,
        skills: 99,
      },
      tags: [
        {
          count: 5,
          id: "tag-1",
          slug: "workflow",
        },
      ],
    });

    expect(calls).toEqual([
      { categories: { all: true, limit: 100 } },
      { tags: { limit: 40 } },
      { skillsCount: true },
      { metrics: { limit: 30 } },
    ]);
  });
});

describe("fetchSkillsBrowsePagination", () => {
  test("forwards the normalized filters and cursor to search", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        search: (input?: {
          categories?: string[];
          cursor?: string;
          limit?: number;
          sort?: string;
          tags?: string[];
        }) => {
          calls.push({ search: input ?? {} });
          return Promise.resolve({
            continueCursor: "cursor-2",
            isDone: false,
            page: [
              {
                description: "Builds workflows",
                id: "skill-1",
                slug: "workflow-builder",
                syncTime: 1710000000,
                title: "Workflow Builder",
              },
            ],
          });
        },
      },
    } satisfies SkillsBrowsePaginationClient;

    await expect(
      fetchSkillsBrowsePagination({
        category: "  operations-automation  ",
        client,
        cursor: "cursor-1",
        q: "  automation  ",
        sort: undefined,
        tag: [" workflow ", "workflow", "ops"],
      }),
    ).resolves.toEqual({
      continueCursor: "cursor-2",
      isDone: false,
      page: [
        {
          description: "Builds workflows",
          id: "skill-1",
          slug: "workflow-builder",
          syncTime: 1710000000,
          title: "Workflow Builder",
        },
      ],
    });

    expect(calls).toEqual([
      {
        search: {
          categories: ["operations-automation"],
          cursor: "cursor-1",
          limit: 24,
          sort: "newest",
          tags: ["ops", "workflow"],
        },
      },
    ]);
  });

  test("uses the same search helper for the first page without a cursor", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        search: (input?: {
          categories?: string[];
          cursor?: string;
          limit?: number;
          sort?: string;
          tags?: string[];
        }) => {
          calls.push({ search: input ?? {} });
          return Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: [],
          });
        },
      },
    } satisfies SkillsBrowsePaginationClient;

    await expect(
      fetchSkillsBrowseInitialPage({
        category: undefined,
        client,
        q: undefined,
        sort: "newest",
        tag: undefined,
      }),
    ).resolves.toEqual({
      continueCursor: "",
      isDone: true,
      page: [],
    });

    expect(calls).toEqual([
      {
        search: {
          categories: undefined,
          cursor: undefined,
          limit: 24,
          sort: "newest",
          tags: undefined,
        },
      },
    ]);
  });
});

describe("fetchSkillsSearch", () => {
  test("forwards search mode to the public search contract", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        search: (input?: {
          categories?: string[];
          limit?: number;
          query?: string;
          rewriteQuery?: boolean;
          searchMode?: "keyword" | "semantic";
          tags?: string[];
        }) => {
          calls.push(input ?? {});
          return Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: [],
          });
        },
      },
    } satisfies SkillsSearchClient;

    await expect(
      fetchSkillsSearch({
        categories: ["developer-tools"],
        client,
        limit: 24,
        query: "workflow",
        rewriteQuery: false,
        searchMode: "keyword",
        tags: ["automation", "typescript"],
      }),
    ).resolves.toEqual({
      data: {
        continueCursor: "",
        isDone: true,
        page: [],
      },
      status: "ok",
    });

    expect(calls).toEqual([
      {
        categories: ["developer-tools"],
        limit: 24,
        query: "workflow",
        rewriteQuery: false,
        searchMode: "keyword",
        tags: ["automation", "typescript"],
      },
    ]);
  });

  test("maps rate-limited search failures into a recoverable result", async () => {
    const client = {
      skills: {
        search: () =>
          Promise.reject(new Error("Search rate limit exceeded. Please try again in 42 seconds.")),
      },
    } satisfies SkillsSearchClient;

    await expect(
      fetchSkillsSearch({
        client,
        limit: 24,
        query: "workflow",
        rewriteQuery: true,
      }),
    ).resolves.toEqual({
      message: "Search rate limit exceeded. Please try again in 42 seconds.",
      status: "rate_limited",
    });
  });
});

describe("fetchSkillFileContent", () => {
  test("renders markdown without frontmatter and keeps the raw source available", async () => {
    const client = {
      snapshots: {
        readSnapshotFileContent: () =>
          Promise.resolve({
            bytesRead: 72,
            content: `---\nname: Example\ndescription: Example\n---\n\n# Title\n\n## Getting Started\n`,
            isTruncated: false,
            offset: 0,
            totalBytes: 72,
          }),
      },
    } satisfies FetchSkillFileContentClient;

    const result = await fetchSkillFileContent({
      client,
      path: "skills/use-skills/SKILL.md",
      snapshotId: "snapshot-1",
    });

    expect(result.rawContent).toContain("name: Example");
    expect(result.tocItems).toEqual([
      { depth: 2, slug: "getting-started", title: "Getting Started" },
    ]);
    expect(result.html).not.toContain("name: Example");
    expect(result.html).toContain('<h2 id="getting-started" tabindex="-1">Getting Started</h2>');
  });
});

describe("fetchSkillDocumentByResolvedSkill", () => {
  test("builds document content without repeating slug resolution", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      snapshots: {
        listBySkill: (input?: { limit?: number; skillId?: string }) => {
          calls.push({ listBySkill: input ?? {} });
          return Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: [
              {
                description: "current snapshot",
                entryPath: "skills/example/SKILL.md",
                hash: "abcdef123456",
                id: "snapshot-1",
                syncTime: 1710000001000,
                version: "v1",
              },
            ],
          });
        },
        readSnapshotFileContent: (input?: {
          path?: string;
          snapshotId?: string;
          maxBytes?: number;
        }) => {
          calls.push({ readSnapshotFileContent: input ?? {} });
          return Promise.resolve({
            bytesRead: 96,
            content:
              "---\nname: Example Skill\ndescription: Example description\n---\n\n# Title\n\n## Usage\n",
            isTruncated: false,
            offset: 0,
            totalBytes: 96,
          });
        },
      },
    } as unknown as FetchSkillDocumentClient;

    const result = await fetchSkillDocumentByResolvedSkill({
      client,
      locale: "en",
      resolvedSkill: {
        authorHandle: "acme",
        description: "Example description",
        id: "skill-1",
        latestVersion: "1.0.0",
        repoName: "skills",
        skillSlug: "example-skill",
        title: "Example Skill",
      },
      selectedSnapshotId: undefined,
    });

    expect(result).toEqual({
      contentHtml: expect.stringContaining('<h2 id="usage"'),
      entryMetaLabel: "skills/example/SKILL.md · 96 B",
      frontmatter: {
        description: "Example description",
        name: "Example Skill",
      },
      tocItems: [{ depth: 2, slug: "usage", title: "Usage" }],
    });

    expect(calls).toEqual([
      { listBySkill: { limit: 3, skillId: "skill-1" } },
      {
        readSnapshotFileContent: {
          maxBytes: 200_000,
          path: "skills/example/SKILL.md",
          snapshotId: "snapshot-1",
        },
      },
    ]);
  });
});

describe("fetchSkillCheckSaved", () => {
  test("forwards the slug to the injected client", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        checkSaved: (input?: { slug: string }) => {
          calls.push({ checkSaved: input ?? {} });
          return Promise.resolve({
            saved: true,
          });
        },
      },
    } satisfies FetchSkillCheckSavedClient;

    await expect(
      fetchSkillCheckSaved({
        client,
        slug: "workflow-builder",
      }),
    ).resolves.toEqual({
      saved: true,
    });

    expect(calls).toEqual([
      {
        checkSaved: {
          slug: "workflow-builder",
        },
      },
    ]);
  });
});

describe("saveSkillToDashboard", () => {
  test("forwards the slug to the injected client", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      collections: {
        saveSkill: (input?: { skillSlug: string }) => {
          calls.push({ saveSkill: input ?? {} });
          return Promise.resolve({
            alreadySaved: false,
            collectionId: "collection-1",
            saved: true,
          });
        },
      },
      skills: {
        unsave: () => Promise.resolve({ unsaved: true }),
      },
    } satisfies SaveSkillClient;

    await expect(
      saveSkillToDashboard({
        client,
        slug: "workflow-builder",
      }),
    ).resolves.toEqual({
      alreadySaved: false,
      saved: true,
    });

    expect(calls).toEqual([
      {
        saveSkill: {
          skillSlug: "workflow-builder",
        },
      },
    ]);
  });
});

describe("unsaveSkillFromDashboard", () => {
  test("forwards the slug to the injected client", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      collections: {
        saveSkill: () =>
          Promise.resolve({ alreadySaved: false, collectionId: "collection-1", saved: true }),
      },
      skills: {
        unsave: (input?: { slug: string }) => {
          calls.push({ unsave: input ?? {} });
          return Promise.resolve({
            unsaved: true,
          });
        },
      },
    } satisfies UnsaveSkillClient;

    await expect(
      unsaveSkillFromDashboard({
        client,
        slug: "workflow-builder",
      }),
    ).resolves.toEqual({
      unsaved: true,
    });

    expect(calls).toEqual([
      {
        unsave: {
          slug: "workflow-builder",
        },
      },
    ]);
  });
});

describe("resolveSnapshot", () => {
  test("prefers id, then version, then first snapshot", () => {
    const snapshots = [
      {
        description: "first",
        entryPath: "SKILL.md",
        hash: "hash-1",
        id: "snapshot-1",
        syncTime: 1,
        version: "v1",
      },
      {
        description: "second",
        entryPath: "README.md",
        hash: "hash-2",
        id: "snapshot-2",
        syncTime: 2,
        version: "v2",
      },
    ];

    expect(resolveSnapshot(snapshots, "snapshot-2")).toEqual({
      description: "second",
      entryPath: "README.md",
      hash: "hash-2",
      id: "snapshot-2",
      syncTime: 2,
      version: "v2",
    });
    const firstSnapshot = snapshots[0] ?? null;
    expect(resolveSnapshot(snapshots, "v1")).toEqual(firstSnapshot);
    expect(resolveSnapshot(snapshots, "missing")).toEqual(firstSnapshot);
    expect(resolveSnapshot(snapshots, null)).toEqual(firstSnapshot);
    expect(resolveSnapshot([], null)).toBeNull();
  });
});

describe("resolveSkillBase", () => {
  test("resolves the canonical path and then loads the public skill by path", async () => {
    const calls: Array<{ kind: "resolve" | "get"; input: Record<string, string> }> = [];
    const client = {
      skills: {
        getByPath: (input: { authorHandle: string; repoName: string; skillSlug: string }) => {
          calls.push({ kind: "get", input });
          return Promise.resolve({
            description: "Builds things",
            id: "skill-1",
            latestVersion: "1.2.3",
            title: "Builder",
          });
        },
        resolvePathBySlug: ({ slug }: { slug: string }) => {
          calls.push({ kind: "resolve", input: { slug } });
          return Promise.resolve({
            authorHandle: "acme",
            repoName: "builder-repo",
            skillSlug: slug,
          });
        },
      },
    } as unknown as ResolveSkillBaseClient;

    await expect(resolveSkillBase({ client, slug: "builder" })).resolves.toEqual({
      authorHandle: "acme",
      description: "Builds things",
      id: "skill-1",
      latestVersion: "1.2.3",
      repoName: "builder-repo",
      skillSlug: "builder",
      title: "Builder",
    });

    expect(calls).toEqual([
      { kind: "resolve", input: { slug: "builder" } },
      {
        kind: "get",
        input: {
          authorHandle: "acme",
          repoName: "builder-repo",
          skillSlug: "builder",
        },
      },
    ]);
  });
});

describe("fetchSkillVersionHistory", () => {
  test("maps snapshots into version history entries", async () => {
    const calls: Array<{ limit?: number; skillId?: string }> = [];
    const client = {
      snapshots: {
        listBySkill: (input?: { limit?: number; skillId?: string }) => {
          calls.push(input ?? {});
          return Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: [
              {
                description: "current snapshot",
                entryPath: "SKILL.md",
                hash: "abcdef123456",
                id: "snapshot-1",
                sourceCommitDate: 1710000000000,
                syncTime: 1710000001000,
                version: "v1",
              },
              {
                description: "older snapshot",
                entryPath: "README.md",
                hash: "123456abcdef",
                id: "snapshot-2",
                syncTime: 1710000002000,
                version: "v2",
              },
            ],
          });
        },
      },
    } as unknown as FetchSkillVersionHistoryClient;

    await expect(fetchSkillVersionHistory({ client, skillId: "skill-1" })).resolves.toEqual([
      {
        date: 1710000000000,
        entryPath: "SKILL.md",
        label: "current",
        snapshotId: "snapshot-1",
        version: "v1",
      },
      {
        date: 1710000002000,
        entryPath: "README.md",
        label: undefined,
        snapshotId: "snapshot-2",
        version: "v2",
      },
    ]);

    expect(calls).toEqual([{ limit: 3, skillId: "skill-1" }]);
  });
});

describe("fetchSkillChangelog", () => {
  test("maps snapshots into changelog entries and version history metadata", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        getByPath: (input?: { authorHandle?: string; repoName?: string; skillSlug?: string }) => {
          calls.push({ getByPath: input ?? {} });
          return Promise.resolve({
            description: "skill description",
            id: "skill-1",
            latestVersion: "v2",
            title: "Skill Title",
          });
        },
        resolvePathBySlug: (input?: { slug?: string }) => {
          calls.push({ resolvePathBySlug: input ?? {} });
          return Promise.resolve({
            authorHandle: "author",
            repoName: "repo",
            skillSlug: input?.slug ?? "skill",
          });
        },
      },
      snapshots: {
        listBySkill: (input?: { limit?: number; skillId?: string }) => {
          calls.push({ listBySkill: input ?? {} });
          return Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: [
              {
                description: "current snapshot",
                entryPath: "SKILL.md",
                hash: "abcdef123456",
                id: "snapshot-1",
                sourceCommitDate: 1710000000000,
                sourceCommitMessage: "feat: add skill\n\nAdd skill parsing details",
                sourceCommitUrl: "https://github.com/acme/skills/commit/abc123",
                syncTime: 1710000001000,
                version: "v1",
              },
              {
                description: "older snapshot",
                entryPath: "README.md",
                hash: "123456abcdef",
                id: "snapshot-2",
                syncTime: 1710000002000,
                version: "v2",
              },
            ],
          });
        },
      },
    } as unknown as FetchSkillChangelogClient;

    await expect(
      fetchSkillChangelog({ client, selectedSnapshotId: "snapshot-2", skillSlug: "skill" }),
    ).resolves.toEqual({
      currentSnapshotId: "snapshot-2",
      entries: [
        {
          body: "Add skill parsing details",
          date: 1710000000000,
          isCurrent: false,
          shaLabel: "abcdef1",
          snapshotId: "snapshot-1",
          sourceCommitUrl: "https://github.com/acme/skills/commit/abc123",
          title: "feat: add skill",
          version: "v1",
        },
        {
          body: null,
          date: 1710000002000,
          isCurrent: true,
          shaLabel: "123456a",
          snapshotId: "snapshot-2",
          sourceCommitUrl: undefined,
          title: "v2",
          version: "v2",
        },
      ],
      skillDescription: "skill description",
      skillId: "skill-1",
      skillTitle: "Skill Title",
      versions: [
        {
          date: 1710000000000,
          entryPath: "SKILL.md",
          label: "current",
          snapshotId: "snapshot-1",
          sourceCommitUrl: "https://github.com/acme/skills/commit/abc123",
          version: "v1",
        },
        {
          date: 1710000002000,
          entryPath: "README.md",
          label: undefined,
          snapshotId: "snapshot-2",
          sourceCommitUrl: undefined,
          version: "v2",
        },
      ],
    });
  });
});

describe("fetchSkillEvalSandboxInitial", () => {
  test("loads suite availability, active agents, and recent eval history for a skill", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      skills: {
        resolvePathBySlug: (input: { slug: string }) => {
          calls.push({ resolvePathBySlug: input });
          return Promise.resolve({
            authorHandle: "acme",
            repoName: "skills",
            skillSlug: "reviewer",
          });
        },
        getByPath: (input: { authorHandle: string; repoName?: string; skillSlug: string }) => {
          calls.push({ getByPath: input });
          return Promise.resolve({
            description: "Reviews patches.",
            id: "skill-1",
            latestVersion: "1.0.0",
            title: "Reviewer",
          });
        },
      },
      skillEvalSandbox: {
        getSuite: (input: { skillId: string; snapshotId?: string }) => {
          calls.push({ getSuite: input });
          return Promise.resolve({
            caseCount: 1,
            cases: [
              {
                fixturePaths: [],
                id: "case-1",
                promptPreview: "Review a patch",
              },
            ],
            fingerprint: "suite-fingerprint",
            id: "suite-1",
            skillId: input.skillId,
            snapshotId: input.snapshotId,
            status: "valid",
            validationErrors: [],
          });
        },
        listAgents: () => {
          calls.push({ listAgents: {} });
          return Promise.resolve([
            {
              capabilities: {
                supportsBaseline: true,
                supportsFilesystem: true,
                supportsStreaming: true,
              },
              defaultLimits: {
                maxOutputBytes: 1000,
                maxSteps: 20,
                timeoutMs: 60_000,
              },
              displayName: "OpenCode",
              id: "agent-1",
              provider: "opencode",
              runtimeFamily: "container",
              sortOrder: 0,
              status: "active",
            },
          ]);
        },
        listRunsBySkill: (input: { limit?: number; skillId: string; snapshotId?: string }) => {
          calls.push({ listRunsBySkill: input });
          return Promise.resolve({
            continueCursor: "",
            isDone: true,
            page: [
              {
                agent: {
                  displayName: "OpenCode",
                  id: "agent-1",
                  provider: "opencode",
                },
                completedAt: 2,
                createdAt: 1,
                id: "run-1",
                skillId: input.skillId,
                snapshotId: input.snapshotId,
                status: "pass",
                summary: {
                  blockedCases: 0,
                  failedCases: 0,
                  passedCases: 1,
                  totalCases: 1,
                },
                syncTime: 2,
              },
            ],
          });
        },
      },
    } as unknown as FetchSkillEvalSandboxInitialClient;

    await expect(
      fetchSkillEvalSandboxInitial({
        client,
        selectedSnapshotId: "snapshot-1",
        skillSlug: "reviewer",
      }),
    ).resolves.toMatchObject({
      agents: [{ id: "agent-1" }],
      latestRun: { id: "run-1", status: "pass" },
      skill: { id: "skill-1", title: "Reviewer" },
      suite: { id: "suite-1", status: "valid" },
    });
    expect(calls).toContainEqual({
      getSuite: { skillId: "skill-1", snapshotId: "snapshot-1" },
    });
    expect(calls).toContainEqual({
      listRunsBySkill: { limit: 5, skillId: "skill-1", snapshotId: "snapshot-1" },
    });
  });
});

describe("fetchSkillEvalRunDetail", () => {
  test("forwards run detail requests through the injected client", async () => {
    const calls: unknown[] = [];
    const client = {
      skillEvalSandbox: {
        getRunDetail: (input: { runId: string }) => {
          calls.push(input);
          return Promise.resolve({
            agent: {
              displayName: "OpenCode",
              id: "agent-1",
              provider: "opencode",
            },
            artifactPrefix: "eval-runs/run-1",
            caseResults: [],
            completedAt: 2,
            createdAt: 1,
            createdBy: "user-1",
            id: input.runId,
            limits: {
              maxOutputBytes: 1000,
              maxSteps: 20,
              timeoutMs: 60_000,
            },
            network: {
              allowlist: [],
              blockMetadataEndpoints: true,
              blockPrivateRanges: true,
              maxBytes: 0,
              maxRequests: 0,
              mode: "deny",
            },
            policyVersion: "skill-eval-sandbox-v1",
            skillId: "skill-1",
            status: "pass",
            summary: {
              blockedCases: 0,
              failedCases: 0,
              passedCases: 1,
              totalCases: 1,
            },
            syncTime: 2,
          });
        },
      },
    } as unknown as FetchSkillEvalRunDetailClient;

    await expect(fetchSkillEvalRunDetail({ client, runId: "run-1" })).resolves.toEqual({
      agent: {
        displayName: "OpenCode",
        id: "agent-1",
        provider: "opencode",
      },
      artifactPrefix: "eval-runs/run-1",
      caseResults: [],
      completedAt: 2,
      createdAt: 1,
      createdBy: "user-1",
      id: "run-1",
      limits: {
        maxOutputBytes: 1000,
        maxSteps: 20,
        timeoutMs: 60_000,
      },
      network: {
        allowlist: [],
        blockMetadataEndpoints: true,
        blockPrivateRanges: true,
        maxBytes: 0,
        maxRequests: 0,
        mode: "deny",
      },
      policyVersion: "skill-eval-sandbox-v1",
      skillId: "skill-1",
      status: "pass",
      summary: {
        blockedCases: 0,
        failedCases: 0,
        passedCases: 1,
        totalCases: 1,
      },
      syncTime: 2,
    });
    expect(calls).toEqual([{ runId: "run-1" }]);
  });
});
