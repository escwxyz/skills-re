import type {
  AiSearchRuntime,
  AiSearchRuntimeResult,
  GithubSubmitRuntime,
  SkillsUploadContentPayload,
  SkillsUploadScheduler,
  SkillsTaggingScheduler,
  SnapshotHistoryRuntime,
  SnapshotUploadScheduler,
} from "../../types";

import { buildAiSearchResult, type AiSearchResult } from "./ai-search";
import { normalizeSkillTags } from "../tags/ai-tagging";
import { toSearchSkillItem } from "../shared/search-skill";
import { normalizeDirectoryPath } from "../repos/directory-path";

interface SkillListRow {
  description: string;
  id: string;
  slug: string;
  syncTime: number;
  title: string;
}

interface AuthorRow {
  avatarUrl: string | null;
  githubUrl: string;
  handle: string;
  isVerified: number;
  name: string | null;
  repoCount: number;
  skillCount: number;
}

interface SkillPathRow {
  authorHandle: string;
  createdAt: number;
  description: string;
  downloadsAllTime: number;
  downloadsTrending: number;
  forkCount: number;
  id: string;
  isVerified: boolean;
  latestVersion: string | null;
  license: string | null;
  primaryCategory: string | null;
  repoName: string;
  repoUrl: string | null;
  slug: string;
  stargazerCount: number;
  syncTime: number;
  title: string;
  updatedAt: number;
  viewsAllTime: number;
}

interface SkillHistoryInfoRow {
  directoryPath: string;
  entryPath: string;
  id: string;
  latestDescription: string;
  latestName: string;
  latestVersion?: string | null;
}

interface SkillClaimContextRow {
  claimedUserId: string | null;
  repoOwnerHandle: string | null;
  skillId: string;
}

interface SubmitGithubRepoPublicInput {
  owner: string;
  repo: string;
  skillRootPath?: string;
}

interface SubmitGithubRepoPublicResult {
  reason?: string;
  skillsCount: number;
  status: "skipped" | "submitted";
  workflowId?: string;
}

interface SearchSkillRow {
  authorHandle: string;
  createdAt: number;
  description: string;
  downloadsAllTime: number;
  downloadsTrending: number;
  forkCount: number;
  id: string;
  isVerified: boolean;
  latestVersion: string | null;
  license: string | null;
  primaryCategory: string | null;
  repoName: string;
  repoUrl: string | null;
  slug: string;
  stargazerCount: number;
  syncTime: number;
  title: string;
  updatedAt: number;
  viewsAllTime: number;
}

interface SearchSkillsPageInput {
  authorHandle?: string;
  categories?: string[];
  cursor?: string;
  mode?: "ai" | "normal";
  limit?: number;
  minAuditScore?: number;
  minScore?: number;
  query?: string;
  rewriteQuery?: boolean;
  sort?: "newest" | "updated" | "views" | "downloads-trending" | "downloads-all-time" | "stars";
  tags?: string[];
}

interface NormalSearchResult {
  ai?: undefined;
  continueCursor: string;
  isDone: boolean;
  page: ReturnType<typeof toSearchSkillItem>[];
}

export interface SkillsServiceDeps {
  checkDuplicatedRepo: (input: {
    directoryPath?: string;
    repoName: string;
    repoOwner: string;
  }) => Promise<{ duplicated: boolean }>;
  checkReposExistingByOwner: (repoOwner: string) => Promise<boolean>;
  checkSkillExistingBySlug: (slug: string) => Promise<boolean>;
  countSkills: () => Promise<number>;
  createSnapshot: (input: {
    description: string;
    directoryPath: string;
    entryPath: string;
    frontmatterHash?: string | null;
    hash: string;
    isDeprecated?: boolean;
    name: string;
    skillContentHash?: string | null;
    skillId: string;
    sourceCommitDate?: number;
    sourceCommitMessage?: string | null;
    sourceCommitSha?: string | null;
    sourceCommitUrl?: string | null;
    syncTime: number;
    version: string;
  }) => Promise<string>;
  findAuthorByHandle: (handle: string) => Promise<AuthorRow | null>;
  findSkillClaimContextBySlug: (slug: string) => Promise<SkillClaimContextRow | null>;
  findSkillByPath: (input: {
    authorHandle: string;
    repoName?: string;
    skillSlug: string;
  }) => Promise<SkillPathRow | null>;
  claimSkillById: (input: { skillId: string; userId: string }) => Promise<void>;
  createSkill: (input: {
    categoryId?: string | null;
    description: string;
    repoId: string;
    slug: string;
    syncTime: number;
    title: string;
    userId?: string | null;
    visibility?: "public" | "private";
  }) => Promise<string>;
  findSkillBySlug: (slug: string) => Promise<SkillListRow | null>;
  listAuthors: () => Promise<AuthorRow[]>;
  listSkillsHistoryInfoByIds: (skillIds: string[]) => Promise<SkillHistoryInfoRow[]>;
  deprecateSnapshotsBeyondLimit: (input: {
    keepLatest: number;
    skillId: string;
  }) => Promise<void>;
  ensureRepo: (input: {
    createdAt: number;
    defaultBranch: string;
    forks: number;
    license?: string | null;
    nameWithOwner: string;
    owner: {
      avatarUrl?: string | null;
      handle: string;
      name?: string | null;
    };
    stars: number;
    updatedAt: number;
  }) => Promise<string>;
  setSkillLatestSnapshot: (input: {
    latestCommitDate?: number | null;
    latestCommitMessage?: string | null;
    latestCommitSha?: string | null;
    latestCommitUrl?: string | null;
    skillId: string;
    snapshotId: string;
    syncTime?: number;
  }) => Promise<void>;
  searchSkillsPageByFilters: (input?: SearchSkillsPageInput) => Promise<{
    continueCursor: string;
    isDone: boolean;
    page: SearchSkillRow[];
  }>;
  listReposPageBySyncTime: (input?: { cursor?: string; limit?: number }) => Promise<{
    continueCursor: string;
    isDone: boolean;
    repos: {
      nameWithOwner: string;
      repoName: string;
      repoOwner: string;
    }[];
  }>;
  listSkillsPageBySyncTime: (input?: { cursor?: string; limit?: number }) => Promise<{
    continueCursor: string;
    isDone: boolean;
    page: SkillListRow[];
  }>;
  resolveSkillPathBySlug: (slug: string) => Promise<{
    authorHandle: string;
    repoName: string;
    skillSlug: string;
  } | null>;
  syncSkillTags: (input: { skillId: string; tags: string[] }) => Promise<unknown>;
  uploadSnapshotFiles: (
    input: {
      files: {
        content: string;
        path: string;
      }[];
      snapshotId: string;
    },
    scheduler?: SnapshotUploadScheduler | null,
  ) => Promise<{ workId: string }>;
}

const defaultDeps: SkillsServiceDeps = {
  checkDuplicatedRepo: async (input) => {
    const { checkDuplicatedRepo } = await import("./repo");
    return await checkDuplicatedRepo(input);
  },
  checkReposExistingByOwner: async (repoOwner) => {
    const { checkReposExistingByOwner } = await import("./repo");
    return await checkReposExistingByOwner(repoOwner);
  },
  checkSkillExistingBySlug: async (slug) => {
    const { checkSkillExistingBySlug } = await import("./repo");
    return await checkSkillExistingBySlug(slug);
  },
  createSnapshot: async (input) => {
    const { createSnapshot } = await import("../snapshots/repo");
    return await createSnapshot(input);
  },
  countSkills: async () => {
    const { countSkills } = await import("./repo");
    return await countSkills();
  },
  findAuthorByHandle: async (handle) => {
    const { findAuthorByHandle } = await import("./repo");
    return await findAuthorByHandle(handle);
  },
  findSkillClaimContextBySlug: async (slug) => {
    const { findSkillClaimContextBySlug } = await import("./repo");
    return await findSkillClaimContextBySlug(slug);
  },
  findSkillByPath: async (input) => {
    const { findSkillByPath } = await import("./repo");
    return await findSkillByPath(input);
  },
  claimSkillById: async (input) => {
    const { claimSkillById } = await import("./repo");
    return await claimSkillById(input);
  },
  createSkill: async (input) => {
    const { createSkill } = await import("./repo");
    return await createSkill(input);
  },
  findSkillBySlug: async (slug) => {
    const { findSkillBySlug } = await import("./repo");
    return await findSkillBySlug(slug);
  },
  listAuthors: async () => {
    const { listAuthors } = await import("./repo");
    return await listAuthors();
  },
  listSkillsHistoryInfoByIds: async (skillIds) => {
    const { listSkillsHistoryInfoByIds } = await import("./repo");
    return await listSkillsHistoryInfoByIds(skillIds);
  },
  deprecateSnapshotsBeyondLimit: async (input) => {
    const { deprecateSnapshotsBeyondLimit } = await import("../snapshots/repo");
    await deprecateSnapshotsBeyondLimit(input);
  },
  ensureRepo: async (input) => {
    const { ensureRepo } = await import("../repos/service");
    return await ensureRepo(input);
  },
  setSkillLatestSnapshot: async (input) => {
    const { setSkillLatestSnapshot } = await import("../snapshots/repo");
    await setSkillLatestSnapshot(input);
  },
  searchSkillsPageByFilters: async (input) => {
    const { searchSkillsPageByFilters } = await import("./repo");
    return await searchSkillsPageByFilters(input);
  },
  listReposPageBySyncTime: async (input) => {
    const { listReposPageBySyncTime } = await import("./repo");
    return await listReposPageBySyncTime(input);
  },
  listSkillsPageBySyncTime: async (input) => {
    const { listSkillsPageBySyncTime } = await import("./repo");
    return await listSkillsPageBySyncTime(input);
  },
  resolveSkillPathBySlug: async (slug) => {
    const { resolveSkillPathBySlug } = await import("./repo");
    return await resolveSkillPathBySlug(slug);
  },
  syncSkillTags: async (input) => {
    const { syncSkillTags } = await import("../tags/service");
    return await syncSkillTags(input);
  },
  uploadSnapshotFiles: async (input, scheduler) => {
    const { uploadSnapshotFiles } = await import("../snapshots/service");
    return await uploadSnapshotFiles(input, scheduler);
  },
};

const toAuthor = (row: AuthorRow) => ({
  avatarUrl: row.avatarUrl ?? undefined,
  githubUrl: row.githubUrl,
  handle: row.handle,
  isVerified: Boolean(row.isVerified),
  name: row.name ?? undefined,
  repoCount: row.repoCount,
  skillCount: row.skillCount,
});

const throwMissingSchedulerError = (name: string): never => {
  throw new Error(`${name} is unavailable. Configure the server workflow binding.`);
};

const throwMissingAiSearchRuntimeError = (): never => {
  throw new Error("AI search runtime is unavailable. Configure the server AI search binding.");
};

export const createSkillsService = (overrides: Partial<SkillsServiceDeps> = {}) => {
  const deps = {
    ...defaultDeps,
    ...overrides,
  };

  return {
    async checkDuplicated(input: {
      directoryPath?: string;
      repoName: string;
      repoOwner: string;
    }) {
      return await deps.checkDuplicatedRepo(input);
    },

    async checkExisting(input: { slug: string }) {
      return await deps.checkSkillExistingBySlug(input.slug);
    },

    async checkExistingRepository(input: { repoOwner: string }) {
      return await deps.checkReposExistingByOwner(input.repoOwner);
    },

    async count() {
      return await deps.countSkills();
    },

    async getAuthorByHandle(input: { handle: string }) {
      const row = await deps.findAuthorByHandle(input.handle);
      return row ? toAuthor(row) : null;
    },

    async claimAsAuthor(input: { githubHandle?: string | null; slug: string; userId: string }) {
      const githubHandle = input.githubHandle?.trim();
      if (!githubHandle) {
        throw new Error("Your account must be linked to GitHub before claiming.");
      }

      const skill = await deps.findSkillClaimContextBySlug(input.slug);
      if (!skill) {
        throw new Error("Skill not found.");
      }

      const ownerHandle = skill.repoOwnerHandle?.trim();
      if (!ownerHandle) {
        throw new Error("This skill cannot be claimed because no repo owner was found.");
      }

      if (ownerHandle.toLowerCase() !== githubHandle.toLowerCase()) {
        throw new Error("Your GitHub handle does not match this skill owner.");
      }

      if (skill.claimedUserId && skill.claimedUserId !== input.userId) {
        throw new Error("This skill has already been claimed by another account.");
      }

      if (skill.claimedUserId === input.userId) {
        return {
          alreadyClaimed: true,
          claimed: true,
        };
      }

      await deps.claimSkillById({
        skillId: skill.skillId,
        userId: input.userId,
      });

      return {
        alreadyClaimed: false,
        claimed: true,
      };
    },

    async getBasic(input: { slug: string }) {
      const row = await deps.findSkillBySlug(input.slug);
      if (!row) {
        return null;
      }

      return {
        description: row.description,
        title: row.title,
      };
    },

    async getByPath(input: {
      authorHandle: string;
      repoName?: string;
      skillSlug: string;
    }) {
      const row = await deps.findSkillByPath(input);
      return row ? toSearchSkillItem(row) : null;
    },

    async list(input?: { cursor?: string; limit?: number }) {
      const page = await deps.listSkillsPageBySyncTime(input);
      return {
        continueCursor: page.continueCursor,
        isDone: page.isDone,
        page: page.page,
      };
    },

    async listAuthors() {
      const rows = await deps.listAuthors();
      return rows.map(toAuthor);
    },

    async getSkillsHistoryInfo(input: { skillIds: string[] }) {
      const rows = await deps.listSkillsHistoryInfoByIds(input.skillIds);
      return rows.map((row) => ({
        directoryPath: row.directoryPath,
        entryPath: row.entryPath,
        id: row.id,
        latestDescription: row.latestDescription,
        latestName: row.latestName,
        latestVersion: row.latestVersion ?? undefined,
      }));
    },

    async search(
      input?: SearchSkillsPageInput,
      aiSearchRuntime?: AiSearchRuntime,
    ): Promise<AiSearchResult | NormalSearchResult> {
      if (input?.mode === "ai") {
        const query = input.query?.trim() ?? "";
        if (!query) {
          throw new Error("query is required for ai mode.");
        }

        const runtime = aiSearchRuntime;
        if (!runtime) {
          throwMissingAiSearchRuntimeError();
        }

        const raw = await runtime!.search({
          query,
          rewriteQuery: input.rewriteQuery,
        });

        return await buildAiSearchResult({
          raw,
          resolveSkillByPath: async (candidate) => {
            const row = await deps.findSkillByPath(candidate);
            return row ? row : null;
          },
          resolveSkillBySlug: async (slug) => {
            const row = await deps.findSkillBySlug(slug);
            return row ? row : null;
          },
        });
      }

      const page = await deps.searchSkillsPageByFilters(input);
      return {
        continueCursor: page.continueCursor,
        isDone: page.isDone,
        page: page.page.map((row) => toSearchSkillItem(row)),
      } satisfies NormalSearchResult;
    },

    async listReposPage(input?: { cursor?: string; limit?: number }) {
      return await deps.listReposPageBySyncTime(input);
    },

    async resolvePathBySlug(input: { slug: string }) {
      return await deps.resolveSkillPathBySlug(input.slug);
    },

    async runUploadSkillsPipeline(
      input: SkillsUploadContentPayload,
      runtimeDeps: {
        scheduleSkillsTagging?: SkillsTaggingScheduler | null;
        snapshotHistory?: SnapshotHistoryRuntime | null;
        snapshotUploadScheduler?: SnapshotUploadScheduler | null;
      } = {},
    ) {
      return await runUploadSkillsPipelineImpl(input, deps, runtimeDeps);
    },
  };
};

type UploadSkillsPipelineDeps = Pick<
  SkillsServiceDeps,
  | "checkSkillExistingBySlug"
  | "createSkill"
  | "createSnapshot"
  | "deprecateSnapshotsBeyondLimit"
  | "ensureRepo"
  | "setSkillLatestSnapshot"
  | "syncSkillTags"
  | "uploadSnapshotFiles"
>;

const truncateUploadCommitMessage = (value: string | null | undefined) => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length <= 280) {
    return normalized;
  }
  return `${normalized.slice(0, 279)}…`;
};

const normalizeUploadDirectoryPath = (value: string) =>
  normalizeDirectoryPath(value).replaceAll(/\/+/g, "/");

const normalizeUploadEntryPath = (value: string) => value.trim();

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

const prepareUploadSkills = async (skills: SkillsUploadContentPayload["skills"]) =>
  await Promise.all(
    skills.map(async (skill) => ({
      ...skill,
      snapshotHash: await hashSnapshotFiles(skill.initialSnapshot.files),
    })),
  );

const resolveUploadSkillSlug = async (input: {
  checkSkillExistingBySlug: UploadSkillsPipelineDeps["checkSkillExistingBySlug"];
  preferredSlug: string;
  usedSlugs: Set<string>;
}) => {
  const baseSlug = input.preferredSlug.trim();
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
    if (!(input.usedSlugs.has(candidate) || (await input.checkSkillExistingBySlug(candidate)))) {
      input.usedSlugs.add(candidate);
      return candidate;
    }
    suffix += 1;
  }
};

const runUploadSkillsPipelineImpl = async (
  input: SkillsUploadContentPayload,
  deps: UploadSkillsPipelineDeps,
  runtimeDeps: {
    scheduleSkillsTagging?: SkillsTaggingScheduler | null;
    snapshotHistory?: SnapshotHistoryRuntime | null;
    snapshotUploadScheduler?: SnapshotUploadScheduler | null;
  } = {},
) => {
  if (!input.repo) {
    throw new Error("Repo metadata is required for skill upload.");
  }

  const repoId = await deps.ensureRepo({
    createdAt: input.repo.createdAt,
    defaultBranch: input.repo.defaultBranch,
    forks: input.repo.forks,
    license: input.repo.license,
    nameWithOwner: input.repo.nameWithOwner,
    owner: {
      avatarUrl: input.repo.owner.avatarUrl ?? null,
      handle: input.repo.owner.handle,
      name: input.repo.owner.name ?? null,
    },
    stars: input.repo.stars,
    updatedAt: input.repo.updatedAt,
  });
  const now = Date.now();
  const preparedSkills = await prepareUploadSkills(input.skills);
  const usedSlugs = new Set<string>();
  const createdIds: string[] = [];
  let firstWorkId: string | null = null;

  for (const skill of preparedSkills) {
    const slug = await resolveUploadSkillSlug({
      checkSkillExistingBySlug: deps.checkSkillExistingBySlug,
      preferredSlug: skill.slug,
      usedSlugs,
    });
    const skillId = await deps.createSkill({
      categoryId: null,
      description: skill.description,
      repoId,
      slug,
      syncTime: now,
      title: skill.title,
      userId: null,
      visibility: "public",
    });
    const snapshotId = await deps.createSnapshot({
      description: skill.description,
      directoryPath: normalizeUploadDirectoryPath(skill.directoryPath),
      entryPath: normalizeUploadEntryPath(skill.entryPath),
      frontmatterHash: skill.frontmatterHash ?? null,
      hash: skill.snapshotHash,
      name: skill.title,
      skillContentHash: skill.skillContentHash ?? null,
      skillId,
      sourceCommitDate: skill.initialSnapshot.sourceCommitDate,
      sourceCommitMessage: truncateUploadCommitMessage(skill.initialSnapshot.sourceCommitMessage),
      sourceCommitSha: skill.initialSnapshot.sourceCommitSha,
      sourceCommitUrl: skill.initialSnapshot.sourceCommitUrl ?? null,
      syncTime: now,
      version: skill.preferredVersion ?? "0.0.1",
    });

    const upload = await deps.uploadSnapshotFiles(
      {
        files: skill.initialSnapshot.files,
        snapshotId,
      },
      runtimeDeps.snapshotUploadScheduler ?? null,
    );

    await deps.setSkillLatestSnapshot({
      latestCommitDate: skill.initialSnapshot.sourceCommitDate,
      latestCommitMessage: truncateUploadCommitMessage(skill.initialSnapshot.sourceCommitMessage),
      latestCommitSha: skill.initialSnapshot.sourceCommitSha,
      latestCommitUrl: skill.initialSnapshot.sourceCommitUrl ?? null,
      skillId,
      snapshotId,
      syncTime: now,
    });
    await deps.syncSkillTags({
      skillId,
      tags: normalizeSkillTags(skill.tags ?? []),
    });
    await deps.deprecateSnapshotsBeyondLimit({
      keepLatest: 3,
      skillId,
    });

    if (runtimeDeps.scheduleSkillsTagging) {
      await runtimeDeps.scheduleSkillsTagging.enqueue({
        skillIds: [skillId],
        triggerCategorizationAfterTagging: true,
      });
    }

    createdIds.push(skillId);
    if (!firstWorkId) {
      firstWorkId = upload.workId;
    }
  }

  if (
    runtimeDeps.snapshotHistory &&
    input.recentCommits &&
    input.recentCommits.length > 1 &&
    createdIds.length > 0 &&
    input.repo.nameWithOwner.includes("/")
  ) {
    const [repoOwner, repoName] = input.repo.nameWithOwner.split("/");
    if (repoOwner && repoName) {
      await runtimeDeps.snapshotHistory.createHistoricalSnapshots({
        commits: input.recentCommits,
        repoName,
        repoOwner,
        skillIds: createdIds,
      });
    }
  }

  return {
    ids: createdIds,
    workId: firstWorkId ?? `upload-${crypto.randomUUID()}`,
  };
};

export const skillsService = createSkillsService();

export async function runUploadSkillsPipeline(
  input: SkillsUploadContentPayload,
  runtimeDeps: {
    scheduleSkillsTagging?: SkillsTaggingScheduler | null;
    snapshotHistory?: SnapshotHistoryRuntime | null;
    snapshotUploadScheduler?: SnapshotUploadScheduler | null;
  } = {},
) {
  return await skillsService.runUploadSkillsPipeline(input, runtimeDeps);
}

export async function checkDuplicatedRepository(input: {
  directoryPath?: string;
  repoName: string;
  repoOwner: string;
}) {
  return await skillsService.checkDuplicated(input);
}

export async function checkExistingSkill(input: { slug: string }) {
  return await skillsService.checkExisting(input);
}

export async function checkExistingRepository(input: { repoOwner: string }) {
  return await skillsService.checkExistingRepository(input);
}

export async function countSkillsPublic() {
  return await skillsService.count();
}

export async function getAuthorByHandle(input: { handle: string }) {
  return await skillsService.getAuthorByHandle(input);
}

export async function claimAsAuthor(input: {
  githubHandle?: string | null;
  slug: string;
  userId: string;
}) {
  return await skillsService.claimAsAuthor(input);
}

export async function getBasicSkill(input: { slug: string }) {
  return await skillsService.getBasic(input);
}

export async function getByPath(input: {
  authorHandle: string;
  repoName?: string;
  skillSlug: string;
}) {
  return await skillsService.getByPath(input);
}

export async function listAuthorsPublic() {
  return await skillsService.listAuthors();
}

export async function getSkillsHistoryInfo(input: { skillIds: string[] }) {
  return await skillsService.getSkillsHistoryInfo(input);
}

export async function searchSkills(
  input?: SearchSkillsPageInput,
  aiSearchRuntime?: AiSearchRuntime,
) {
  return await skillsService.search(input, aiSearchRuntime);
}

export async function aiSearch(
  input: { query: string; rewriteQuery?: boolean },
  aiSearchRuntime?: AiSearchRuntime,
): Promise<AiSearchRuntimeResult> {
  const runtime = aiSearchRuntime;
  if (!runtime) {
    throwMissingAiSearchRuntimeError();
  }

  return await runtime!.search({
    query: input.query,
    rewriteQuery: input.rewriteQuery,
  });
}

export async function listReposPage(input?: { cursor?: string; limit?: number }) {
  return await skillsService.listReposPage(input);
}

export async function listSkills(input?: { cursor?: string; limit?: number }) {
  return await skillsService.list(input);
}

export async function resolvePathBySlug(input: { slug: string }) {
  return await skillsService.resolvePathBySlug(input);
}

export async function uploadSkills(
  input: SkillsUploadContentPayload,
  scheduler?: SkillsUploadScheduler,
) {
  const activeScheduler = scheduler;
  if (!activeScheduler) {
    throwMissingSchedulerError("Skills upload workflow scheduler");
  }

  const scheduled = await activeScheduler!.enqueue(input);
  return {
    ids: [] as string[],
    workId: scheduled.workId,
  };
}

export async function submitGithubRepoPublic(
  input: SubmitGithubRepoPublicInput,
  runtime: GithubSubmitRuntime,
  scheduler?: SkillsUploadScheduler,
): Promise<SubmitGithubRepoPublicResult> {
  const result = await runtime.buildPayload({
    owner: input.owner,
    repo: input.repo,
    skillRootPath: input.skillRootPath,
  });

  if (!result.payload) {
    return {
      reason: result.reason ?? "no-valid-skills",
      skillsCount: 0,
      status: "skipped",
    };
  }

  const uploaded = await uploadSkills(result.payload, scheduler);
  return {
    skillsCount: result.payload.skills.length,
    status: "submitted",
    workflowId: uploaded.workId,
  };
}
