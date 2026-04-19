import { z } from "zod/v4";

import { asRepoId, asSkillId, asSnapshotId } from "@skills-re/db/utils";

const repoStatsQueryResultSchema = z.object({
  repository: z
    .object({
      forkCount: z.number().int().nonnegative(),
      nameWithOwner: z.string(),
      stargazerCount: z.number().int().nonnegative(),
      updatedAt: z.string(),
    })
    .nullable(),
});

const getRepoStatsQuery = `
query GetRepoStats($owner: String!, $name: String!) {
  repository(followRenames: true, name: $name, owner: $owner) {
    updatedAt
    nameWithOwner
    stargazerCount
    forkCount
  }
}
`;

interface RepoOverviewCommit {
  committedDate?: string | null;
  message?: string | null;
  sha: string;
  url?: string | null;
}

interface RepoOverview {
  commits: RepoOverviewCommit[];
  headSha: string | null;
}

export interface RepoStatsSyncSchedulerInput {
  cursor?: string;
  limit?: number;
  runAfterMs?: number;
}

export interface RepoStatsSyncScheduler {
  enqueue(input: RepoStatsSyncSchedulerInput): Promise<{ workId: string }>;
}

export interface ReposServiceDeps {
  checkDuplicatedRepo: (input: {
    repoOwner: string;
    repoName: string;
    directoryPath?: string;
  }) => Promise<{ duplicated: boolean }>;
  checkReposExistingByOwner: (repoOwner: string) => Promise<boolean>;
  createRepo: (input: {
    createdAt: number;
    defaultBranch: string;
    forks: number;
    license?: string | null;
    name: string;
    nameWithOwner: string;
    ownerAvatarUrl?: string | null;
    ownerHandle: string;
    ownerName?: string | null;
    stars: number;
    syncTime: number;
    updatedAt: number;
    url: string;
  }) => Promise<string>;
  fetchRepoStats: (query: string, variables: { name: string; owner: string }) => Promise<unknown>;
  githubConfigured: () => boolean;
  fetchRepoOverview: (input: {
    owner: string;
    repo: string;
  }) => Promise<{
    commits: {
      committedDate?: string | null;
      message?: string | null;
      sha: string;
      url?: string | null;
    }[];
    headSha: string | null;
  }>;
  findRepoById: (id: string) => Promise<{
    forks: number;
    id: string;
    name: string;
    nameWithOwner: string;
    ownerAvatarUrl: string | null;
    ownerHandle: string;
    ownerName: string | null;
    stars: number;
    updatedAt: number;
  } | null>;
  findRepoByNameWithOwner: (nameWithOwner: string) => Promise<{
    id: string;
    updatedAt?: number;
  } | null>;
  fetchSkillFilesForRoot: (input: {
    owner: string;
    repo: string;
    skillRootPath: string;
    tree: { path: string; sha: string; size?: number; type: "blob" | "tree" }[];
  }) => Promise<{ files: { content: string; path: string }[] }>;
  fetchTree: (input: {
    commitSha: string;
    owner: string;
    repo: string;
  }) => Promise<{ path: string; sha: string; size?: number; type: "blob" | "tree" }[]>;
  createSnapshot: (input: {
    description: string;
    directoryPath: string;
    entryPath: string;
    hash: string;
    name: string;
    skillId: string;
    sourceCommitDate?: number;
    sourceCommitMessage?: string | null;
    sourceCommitSha: string;
    sourceCommitUrl?: string | null;
    syncTime: number;
    version: string;
  }) => Promise<string>;
  listReposPageBySyncTime: (input?: { cursor?: string; limit?: number }) => Promise<{
    continueCursor: string;
    isDone: boolean;
    repos: { nameWithOwner: string; repoName: string; repoOwner: string }[];
  }>;
  listRepoSkillSnapshotHeadsByRepoId: (repoId: string) => Promise<{
    directoryPath: string;
    entryPath: string;
    latestDescription: string;
    latestHash: string;
    latestName: string;
    latestSnapshotId: string;
    latestSourceCommitSha: string | null;
    latestVersion: string;
    skillId: string;
    slug: string;
  }[]>;
  setSkillLatestSnapshot: (input: {
    latestCommitDate?: number | null;
    latestCommitMessage?: string | null;
    latestCommitSha?: string | null;
    latestCommitUrl?: string | null;
    skillId: string;
    snapshotId: string;
    syncTime?: number;
  }) => Promise<void>;
  uploadSnapshotFiles: (input: {
    files: { content: string; path: string }[];
    snapshotId: string;
  }) => Promise<{ workId: string }>;
  updateRepoStatsByNameWithOwner: (input: {
    forks: number;
    nameWithOwner: string;
    stars: number;
    updatedAt: number;
  }) => Promise<{ changed: boolean }>;
  deprecateSnapshotsBeyondLimit: (input: {
    keepLatest: number;
    skillId: string;
  }) => Promise<void>;
}

const normalizeRelativePath = (value: string) => {
  const segments: string[] = [];
  for (const rawSegment of value.split("/")) {
    const segment = rawSegment.trim();
    if (segment.length === 0 || segment === ".") {
      continue;
    }
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join("/");
};

const normalizeFiles = (files: { content: string; path: string }[]) =>
  files.map((file) => ({
    content: file.content,
    path: normalizeRelativePath(file.path),
  }));

const truncateCommitMessage = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  const maxLength = 280;
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
};

const deriveNextSnapshotVersion = (latestVersion: string) => {
  const segments = latestVersion.split(".").map((segment) => Number.parseInt(segment, 10));
  const major = segments[0] ?? 0;
  const minor = segments[1] ?? 0;
  const patch = segments[2] ?? 0;

  if (!(Number.isFinite(major) && Number.isFinite(minor) && Number.isFinite(patch))) {
    return "0.0.1";
  }

  return `${major}.${minor}.${patch + 1}`;
};

const hashSnapshotFiles = async (files: { content: string; path: string }[]) => {
  const serialized = JSON.stringify(
    [...files]
      .map((file) => ({
        content: file.content,
        path: file.path,
      }))
      .toSorted((left, right) => left.path.localeCompare(right.path)),
  );
  const encoded = new TextEncoder().encode(serialized);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const defaultDeps: ReposServiceDeps = {
  checkDuplicatedRepo: async (input) => {
    const { checkDuplicatedRepo } = await import("../skills/repo");
    return await checkDuplicatedRepo(input);
  },
  checkReposExistingByOwner: async (repoOwner) => {
    const { checkReposExistingByOwner } = await import("../skills/repo");
    return await checkReposExistingByOwner(repoOwner);
  },
  createRepo: async (input) => {
    const { createRepo } = await import("./repo");
    return await createRepo(input);
  },
  fetchRepoStats: async () => {
    throw new Error("GitHub stats fetch is not configured.");
  },
  githubConfigured: () =>
    Boolean(
      typeof process !== "undefined" &&
        (process.env.GH_PAT || process.env.GITHUB_TOKEN),
    ),
  fetchRepoOverview: async () => {
    throw new Error("GitHub repo overview fetch is not configured.");
  },
  fetchSkillFilesForRoot: async () => {
    throw new Error("GitHub file fetch is not configured.");
  },
  fetchTree: async () => {
    throw new Error("GitHub tree fetch is not configured.");
  },
  findRepoById: async (id) => {
    const { findRepoById } = await import("./repo");
    return await findRepoById(id);
  },
  findRepoByNameWithOwner: async (nameWithOwner) => {
    const { findRepoByNameWithOwner } = await import("./repo");
    return await findRepoByNameWithOwner(nameWithOwner);
  },
  createSnapshot: async (input) => {
    const { createSnapshot } = await import("../snapshots/repo");
    return await createSnapshot({
      ...input,
      skillId: asSkillId(input.skillId),
    });
  },
  listReposPageBySyncTime: async (input) => {
    const { listReposPageBySyncTime } = await import("../skills/repo");
    return await listReposPageBySyncTime(input);
  },
  listRepoSkillSnapshotHeadsByRepoId: async (repoId) => {
    const { listRepoSkillSnapshotHeadsByRepoId } = await import("../skills/repo");
    return await listRepoSkillSnapshotHeadsByRepoId(asRepoId(repoId));
  },
  setSkillLatestSnapshot: async (input) => {
    const { setSkillLatestSnapshot } = await import("../snapshots/repo");
    return await setSkillLatestSnapshot({
      ...input,
      skillId: asSkillId(input.skillId),
      snapshotId: asSnapshotId(input.snapshotId),
    });
  },
  uploadSnapshotFiles: async () => {
    throw new Error("Snapshot upload workflow is not configured.");
  },
  deprecateSnapshotsBeyondLimit: async (input) => {
    const { deprecateSnapshotsBeyondLimit } = await import("../snapshots/repo");
    await deprecateSnapshotsBeyondLimit({
      ...input,
      skillId: asSkillId(input.skillId),
    });
  },
  updateRepoStatsByNameWithOwner: async (input) => {
    const { updateRepoStatsByNameWithOwner } = await import("./repo");
    return await updateRepoStatsByNameWithOwner(input);
  },
};

export const createReposService = (overrides: Partial<ReposServiceDeps> = {}) => {
  const deps = {
    ...defaultDeps,
    ...overrides,
  };

  const service = {
    async checkDuplicated(input: {
      repoOwner: string;
      repoName: string;
      directoryPath?: string;
    }) {
      return await deps.checkDuplicatedRepo(input);
    },

    async checkExisting(input: { repoOwner: string }) {
      return await deps.checkReposExistingByOwner(input.repoOwner);
    },

    async getById(id: string) {
      return await deps.findRepoById(id);
    },

    async ensureRepo(input: {
      nameWithOwner: string;
      license?: string | null;
      stars: number;
      forks: number;
      createdAt: number;
      updatedAt: number;
      defaultBranch: string;
      owner: {
        handle: string;
        name?: string | null;
        avatarUrl?: string | null;
      };
    }) {
      const existing = await deps.findRepoByNameWithOwner(input.nameWithOwner);
      if (existing) {
        return existing.id;
      }

      const [owner, name] = input.nameWithOwner.split("/");
      if (!(owner && name)) {
        throw new Error("Invalid repo nameWithOwner.");
      }

      return await deps.createRepo({
        createdAt: input.createdAt,
        defaultBranch: input.defaultBranch,
        forks: input.forks,
        license: input.license ?? null,
        name,
        nameWithOwner: input.nameWithOwner,
        ownerAvatarUrl: input.owner.avatarUrl ?? null,
        ownerHandle: input.owner.handle,
        ownerName: input.owner.name ?? null,
        stars: input.stars,
        syncTime: Date.now(),
        updatedAt: input.updatedAt,
        url: `https://github.com/${input.nameWithOwner}`,
      });
    },

    async enqueueStatsSync(scheduler: RepoStatsSyncScheduler, input?: { limit?: number }) {
      return await scheduler.enqueue({
        limit: input?.limit ?? 20,
        runAfterMs: 0,
      });
    },

    async listPage(input?: { cursor?: string; limit?: number }) {
      const page = await deps.listReposPageBySyncTime({
        cursor: input?.cursor,
        limit: input?.limit,
      });

      return {
        continueCursor: page.continueCursor,
        isDone: page.isDone,
        repos: page.repos,
      };
    },

    async updateStats(input: {
      forks: number;
      nameWithOwner: string;
      stars: number;
      updatedAt: number;
    }) {
      return await deps.updateRepoStatsByNameWithOwner(input);
    },

    async syncStats(input?: { cursor?: string; limit?: number }) {
      if (!deps.githubConfigured()) {
        throw new Error("GitHub token is not configured.");
      }

      const limit = input?.limit ?? 20;
      const { repos, isDone, continueCursor } = await service.listPage({
        cursor: input?.cursor,
        limit,
      });

      if (repos.length === 0) {
        return null;
      }

      const changed: {
        repoOwner: string;
        repoName: string;
        updatedAt: number;
      }[] = [];

      await Promise.all(
        repos.map(async (repo) => {
          const result = await deps.fetchRepoStats(getRepoStatsQuery, {
            name: repo.repoName,
            owner: repo.repoOwner,
          });
          const parsedResult = repoStatsQueryResultSchema.safeParse(result);
          if (!parsedResult.success) {
            return;
          }

          const { repository } = parsedResult.data;
          if (!repository) {
            return;
          }

          const updatedAt = Date.parse(repository.updatedAt);
          if (Number.isNaN(updatedAt)) {
            return;
          }

          const resultUpdate = await service.updateStats({
            forks: repository.forkCount,
            nameWithOwner: repository.nameWithOwner,
            stars: repository.stargazerCount,
            updatedAt,
          });

          if (resultUpdate.changed) {
            changed.push({
              repoName: repo.repoName,
              repoOwner: repo.repoOwner,
              updatedAt,
            });
          }
        }),
      );

      return {
        changed,
        continueCursor,
        isDone,
      };
    },

    async syncRepoSnapshots(
      input: {
        repoOwner: string;
        repoName: string;
        expectedUpdatedAt?: number;
      },
      runtimeDeps?: Partial<
        Pick<
          ReposServiceDeps,
          | "createSnapshot"
          | "deprecateSnapshotsBeyondLimit"
          | "fetchRepoOverview"
          | "fetchSkillFilesForRoot"
          | "fetchTree"
          | "listRepoSkillSnapshotHeadsByRepoId"
          | "setSkillLatestSnapshot"
          | "uploadSnapshotFiles"
        >
      >,
    ) {
      const activeDeps = {
        ...deps,
        ...runtimeDeps,
      };

      if (!activeDeps.githubConfigured()) {
        throw new Error("GitHub token is not configured.");
      }

      const repo = await activeDeps.findRepoByNameWithOwner(`${input.repoOwner}/${input.repoName}`);
      if (!repo) {
        return {
          checkedSkills: 0,
          createdSnapshots: 0,
          reason: "repo-not-found",
          status: "skipped" as const,
        };
      }

      if (
        typeof input.expectedUpdatedAt === "number" &&
        typeof repo.updatedAt === "number" &&
        repo.updatedAt > input.expectedUpdatedAt
      ) {
        return {
          checkedSkills: 0,
          createdSnapshots: 0,
          reason: "stale-trigger",
          status: "skipped" as const,
        };
      }

      const overview = (await activeDeps.fetchRepoOverview({
        owner: input.repoOwner,
        repo: input.repoName,
      })) as RepoOverview;
      const headCommit = overview.commits[0];
      if (!(overview.headSha && headCommit)) {
        return {
          checkedSkills: 0,
          createdSnapshots: 0,
          reason: "missing-head-commit",
          status: "skipped" as const,
        };
      }

      const skills = await activeDeps.listRepoSkillSnapshotHeadsByRepoId(repo.id);
      if (skills.length === 0) {
        return {
          checkedSkills: 0,
          createdSnapshots: 0,
          reason: "no-skills",
          status: "completed" as const,
        };
      }

      const tree = await activeDeps.fetchTree({
        commitSha: overview.headSha,
        owner: input.repoOwner,
        repo: input.repoName,
      });
      const filesResponse = await activeDeps.fetchSkillFilesForRoot({
        owner: input.repoOwner,
        repo: input.repoName,
        skillRootPath: "skills",
        tree,
      });
      const allSkillFiles = normalizeFiles(filesResponse.files);

      let createdSnapshots = 0;
      let unchangedByCommit = 0;
      let unchangedByHash = 0;
      let missingSkillFiles = 0;

      for (const skill of skills) {
        if (skill.latestSourceCommitSha === overview.headSha) {
          unchangedByCommit += 1;
          continue;
        }

        const directoryPath = skill.directoryPath.endsWith("/")
          ? skill.directoryPath
          : `${skill.directoryPath}/`;
        const filesForSkill = allSkillFiles.filter((file) => file.path.startsWith(directoryPath));
        if (filesForSkill.length === 0) {
          missingSkillFiles += 1;
          continue;
        }

        const nextHash = await hashSnapshotFiles(filesForSkill);
        if (nextHash === skill.latestHash) {
          unchangedByHash += 1;
          continue;
        }

        const committedDate = headCommit.committedDate ? Date.parse(headCommit.committedDate) : null;
        const commitMessage = truncateCommitMessage(headCommit.message);
        const snapshotId = await activeDeps.createSnapshot({
          description: skill.latestDescription,
          directoryPath: skill.directoryPath,
          entryPath: skill.entryPath,
          hash: nextHash,
          name: skill.latestName,
          skillId: skill.skillId,
          sourceCommitDate: committedDate ?? undefined,
          sourceCommitMessage: commitMessage,
          sourceCommitSha: overview.headSha,
          sourceCommitUrl: headCommit.url ?? null,
          syncTime: committedDate ?? Date.now(),
          version: deriveNextSnapshotVersion(skill.latestVersion),
        });

        await activeDeps.uploadSnapshotFiles({
          files: filesForSkill,
          snapshotId,
        });
        await activeDeps.setSkillLatestSnapshot({
          latestCommitDate: committedDate,
          latestCommitMessage: commitMessage,
          latestCommitSha: overview.headSha,
          latestCommitUrl: headCommit.url ?? null,
          skillId: skill.skillId,
          snapshotId,
        });
        await activeDeps.deprecateSnapshotsBeyondLimit({
          keepLatest: 3,
          skillId: skill.skillId,
        });
        createdSnapshots += 1;
      }

      return {
        checkedSkills: skills.length,
        createdSnapshots,
        headSha: overview.headSha,
        missingSkillFiles,
        status: "completed" as const,
        unchangedByCommit,
        unchangedByHash,
      };
    },
  };

  return service;
};

export const reposService = createReposService();

export const checkDuplicated = (input: {
  repoOwner: string;
  repoName: string;
  directoryPath?: string;
}) => reposService.checkDuplicated(input);

export const checkExisting = (input: { repoOwner: string }) =>
  reposService.checkExisting(input);

export const ensureRepo = (input: {
  nameWithOwner: string;
  license?: string | null;
  stars: number;
  forks: number;
  createdAt: number;
  updatedAt: number;
  defaultBranch: string;
  owner: {
    handle: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
}) => reposService.ensureRepo(input);

export const enqueueStatsSync = (scheduler: RepoStatsSyncScheduler, input?: { limit?: number }) =>
  reposService.enqueueStatsSync(scheduler, input);

export const getById = (id: string) => reposService.getById(id);

export const listPage = (input?: { cursor?: string; limit?: number }) =>
  reposService.listPage(input);

export const syncStats = (input?: { cursor?: string; limit?: number }) =>
  reposService.syncStats(input);

export const syncRepoSnapshots = (
  input: {
    repoOwner: string;
    repoName: string;
    expectedUpdatedAt?: number;
  },
  runtimeDeps?: Partial<
    Pick<
      ReposServiceDeps,
      | "createSnapshot"
      | "deprecateSnapshotsBeyondLimit"
      | "fetchRepoOverview"
      | "fetchSkillFilesForRoot"
      | "fetchTree"
      | "listRepoSkillSnapshotHeadsByRepoId"
      | "setSkillLatestSnapshot"
      | "uploadSnapshotFiles"
    >
  >,
) => reposService.syncRepoSnapshots(input, runtimeDeps);

export const updateStats = (input: {
  forks: number;
  nameWithOwner: string;
  stars: number;
  updatedAt: number;
}) => reposService.updateStats(input);
