import type { AiTaskRuntime } from "./modules/ai/runtime";

export type { AiTaskAdapter, AiTaskRuntime, AiTaskType } from "./modules/ai/runtime";

export type AuthSession = {
  session: {
    expiresAt: Date | string;
    id: string;
    userId: string;
  };
  user: {
    email?: string;
    github?: string | null;
    id: string;
    image?: string | null;
    name?: string;
    role?: string | null;
  };
} | null;

export interface RepoStatsSyncScheduler {
  enqueue(input: {
    cursor?: string;
    limit?: number;
    runAfterMs?: number;
  }): Promise<{ workId: string }>;
}

export interface RepoSnapshotSyncScheduler {
  enqueue(input: {
    expectedUpdatedAt?: number;
    repoName: string;
    repoOwner: string;
  }): Promise<{ workId: string }>;
}

export interface SnapshotUploadScheduler {
  enqueue(input: {
    files: {
      content: string;
      path: string;
    }[];
    snapshotId: string;
  }): Promise<{ workId: string }>;
}

export interface SnapshotArchiveUploadScheduler {
  enqueue(input: { snapshotId: string }): Promise<{ workId: string }>;
}

export interface SkillsUploadContentPayload {
  recentCommits?: {
    committedDate?: string | null;
    message?: string | null;
    sha: string;
    url?: string | null;
  }[];
  repo?: {
    createdAt: number;
    defaultBranch: string;
    forks: number;
    license: string;
    nameWithOwner: string;
    owner: {
      avatarUrl?: string;
      handle: string;
      name?: string;
    };
    stars: number;
    updatedAt: number;
  };
  skills: {
    description?: string;
    directoryPath: string;
    entryPath: string;
    frontmatterHash?: string;
    initialSnapshot: {
      files: {
        content: string;
        path: string;
      }[];
      sourceCommitDate: number;
      sourceCommitMessage?: string;
      sourceCommitSha: string;
      sourceCommitUrl?: string;
      sourceRef: string;
      tree: {
        path: string;
        sha: string;
        size?: number;
        type: "blob" | "tree";
      }[];
    };
    license?: string;
    preferredVersion?: string;
    slug: string;
    sourceLocator: string;
    sourceType: "github" | "upload";
    skillContentHash?: string;
    tags?: string[];
    title: string;
  }[];
}

export interface SkillsUploadScheduler {
  enqueue(input: SkillsUploadContentPayload): Promise<{ workId: string }>;
}

export interface SkillSummaryScheduler {
  enqueue(input: { snapshotId: string }): Promise<{ workId: string }>;
}

export interface SkillsTaggingScheduler {
  enqueue(input: {
    skillIds: string[];
    triggerCategorizationAfterTagging?: boolean;
  }): Promise<{ workId: string }>;
}

export interface WorkerLogger {
  child(fields: Record<string, unknown>): WorkerLogger;
  debug(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
}

export interface GithubSubmitRuntime {
  buildPayload(input: { owner: string; repo: string; skillRootPath?: string }): Promise<{
    payload: SkillsUploadContentPayload | null;
    reason?: string;
  }>;
}

export interface GithubFetchRuntime {
  fetchRepo(input: { githubUrl: string }): Promise<{
    branch: string;
    commitDate: string | null;
    commitMessage: string | null;
    commitSha: string;
    forkCount: number | null;
    invalidSkills: {
      message: string;
      skillMdPath: string;
      skillRootPath: string;
    }[];
    licenseInfo: {
      name: string;
    } | null;
    nameWithOwner: string | null;
    owner: string;
    ownerAvatarUrl: string | null;
    ownerHandle: string;
    ownerName: string | null;
    recentCommits: {
      committedDate?: string | null;
      message?: string | null;
      sha: string;
      url?: string | null;
    }[];
    repo: string;
    repoCreatedAt: string | null;
    repoUpdatedAt: string | null;
    repoUrl: string | null;
    requestedSkillPath: string | null;
    skills: {
      files: {
        content: string;
        path: string;
      }[];
      frontmatter: Record<string, unknown>;
      skillDescription: string;
      skillMdContent: string;
      skillMdPath: string;
      skillRootPath: string;
      skillTitle: string;
    }[];
    stargazerCount: number | null;
    tree: {
      path: string;
      sha: string;
      size?: number;
      type: "blob" | "tree";
    }[];
  }>;
}

export interface AiSearchRuntimeResult {
  [key: string]: unknown;
  data?: unknown[];
  has_more?: boolean;
  response?: unknown;
  search_query?: string;
}

export interface AiSearchRuntime {
  search(input: { query: string; rewriteQuery?: boolean }): Promise<AiSearchRuntimeResult>;
}

export interface SnapshotHistoryRuntime {
  createHistoricalSnapshots(input: {
    commits: {
      committedDate?: string | null;
      message?: string | null;
      sha: string;
      url?: string | null;
    }[];
    repoName: string;
    repoOwner: string;
    skillIds: string[];
  }): Promise<null>;
}

export interface SnapshotStorageRuntime {
  buildSnapshotFilePublicUrl(key: string): string;
  getSnapshotArchiveObject(key: string): Promise<{
    body?: unknown;
    httpEtag?: string;
    httpMetadata?: {
      contentType?: string;
    };
    size?: number;
  } | null>;
  getSnapshotFileObject(
    key: string,
    range?: {
      length: number;
      offset: number;
    },
  ): Promise<{
    arrayBuffer(): Promise<ArrayBuffer>;
    body?: unknown;
    size?: number;
  } | null>;
}

export interface GithubSnapshotTreeEntry {
  path: string;
  sha: string;
  size?: number;
  type: "blob" | "tree";
}

export interface GithubSnapshotHistoryHelpers {
  buildSkillTreeEntries: (
    tree: GithubSnapshotTreeEntry[],
    skillRootPath: string,
  ) => GithubSnapshotTreeEntry[];
  fetchCommitSha: (input: { owner: string; ref: string; repo: string }) => Promise<string>;
  fetchSkillFilesForRoot: (input: {
    owner: string;
    repo: string;
    skillRootPath: string;
    tree: GithubSnapshotTreeEntry[];
  }) => Promise<{ files: { content: string; path: string }[] }>;
  fetchTree: (input: {
    commitSha: string;
    owner: string;
    repo: string;
  }) => Promise<GithubSnapshotTreeEntry[]>;
  hasGithubToken: () => boolean;
}

export interface Context {
  auth: null;
  aiTasks?: AiTaskRuntime;
  session: AuthSession;
  aiSearch?: AiSearchRuntime;
  githubHistory?: GithubSnapshotHistoryHelpers;
  githubFetch?: GithubFetchRuntime;
  githubSubmit?: GithubSubmitRuntime;
  snapshotHistory?: SnapshotHistoryRuntime;
  snapshotStorage?: SnapshotStorageRuntime;
  workerLogger?: WorkerLogger;
  workflowSchedulers?: {
    snapshotArchiveUpload?: SnapshotArchiveUploadScheduler;
    snapshotUpload?: SnapshotUploadScheduler;
    repoStatsSync?: RepoStatsSyncScheduler;
    repoSnapshotSync?: RepoSnapshotSyncScheduler;
    skillsUpload?: SkillsUploadScheduler;
    skillSummary?: SkillSummaryScheduler;
    skillsTagging?: SkillsTaggingScheduler;
  };
}
