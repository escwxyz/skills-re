import { decodeCursor, encodeCursor } from "../shared/pagination";
import type {
  SnapshotArchiveUploadScheduler,
  SnapshotStorageRuntime,
  SnapshotUploadScheduler,
} from "../../types";
import {
  buildSnapshotArchiveStagingKey,
  buildSnapshotArchiveTarEntries,
  createSnapshotArchiveBuffer,
} from "./archive";
import type { SnapshotArchiveTarEntry } from "./archive";

import { asSkillId, asSnapshotId } from "@skills-re/db/utils";
import type { SnapshotId } from "@skills-re/db/utils";

import type { SnapshotFileRow, SnapshotListItem, SnapshotPageCursor } from "./repo";

interface SnapshotFileObject {
  arrayBuffer(): Promise<ArrayBuffer>;
  body?: unknown;
  size?: number;
}

interface SnapshotArchiveObject {
  body?: unknown;
  httpEtag?: string;
  httpMetadata?: {
    contentType?: string;
  };
  size?: number;
}

interface SnapshotArchiveStagingObject extends SnapshotArchiveObject {
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface GitTreeEntry {
  path: string;
  sha: string;
  size?: number;
  type: "blob" | "tree";
}

interface SnapshotHistoryInfo {
  directoryPath: string;
  entryPath: string;
  id: string;
  latestDescription: string;
  latestName: string;
  latestVersion: string;
}

export interface SnapshotsServiceDeps {
  buildSnapshotFilePublicUrl: (key: string) => string;
  getSnapshotById: (snapshotId: SnapshotId) => Promise<SnapshotListItem | null>;
  getSnapshotBySkillAndVersion: (input: {
    skillId: string;
    version: string;
  }) => Promise<SnapshotListItem | null>;
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
  deprecateSnapshotsBeyondLimit: (input: { keepLatest: number; skillId: string }) => Promise<void>;
  fetchCommitSha: (input: { owner: string; ref: string; repo: string }) => Promise<string>;
  buildSkillTreeEntries: (tree: GitTreeEntry[], skillRootPath: string) => GitTreeEntry[];
  fetchSkillFilesForRoot: (input: {
    owner: string;
    repo: string;
    skillRootPath: string;
    tree: GitTreeEntry[];
  }) => Promise<{ files: { content: string; path: string }[] }>;
  fetchTree: (input: { commitSha: string; owner: string; repo: string }) => Promise<GitTreeEntry[]>;
  getSnapshotFileByPath: (input: {
    snapshotId: SnapshotId;
    path: string;
  }) => Promise<SnapshotFileRow | null>;
  getSnapshotBySkillAndCommit: (input: {
    skillId: string;
    sourceCommitSha: string;
  }) => Promise<SnapshotListItem | null>;
  getSnapshotArchiveStagingObject: (
    stagingKey: string,
  ) => Promise<SnapshotArchiveStagingObject | null>;
  getSnapshotArchiveObject: (archiveKey: string) => Promise<SnapshotArchiveObject | null>;
  getSnapshotStorageContext: (snapshotId: SnapshotId) => Promise<{
    directoryPath: string;
    repoName: string | null;
    repoOwner: string | null;
    snapshotId: SnapshotId;
    version: string;
  } | null>;
  hasGithubToken: () => boolean;
  listSnapshotFiles: (snapshotId: SnapshotId) => Promise<SnapshotFileRow[]>;
  listSnapshotsPageBySkill: (input: {
    cursor?: SnapshotPageCursor | null;
    limit?: number;
    skillId: string;
  }) => Promise<{
    isDone: boolean;
    nextCursor: SnapshotPageCursor | null;
    page: SnapshotListItem[];
  }>;
  listSkillsHistoryInfoByIds: (skillIds: string[]) => Promise<SnapshotHistoryInfo[]>;
  readSnapshotFileObject: (
    key: string,
    range?: { length: number; offset: number },
  ) => Promise<SnapshotFileObject | null>;
  putSnapshotArchiveObject: (
    key: string,
    body: ArrayBuffer | Uint8Array | string,
    contentType?: string,
  ) => Promise<void>;
  putSnapshotArchiveStagingObject: (
    key: string,
    body: ArrayBuffer | Uint8Array | string,
    contentType?: string,
  ) => Promise<void>;
  setSnapshotArchiveR2Key: (input: { archiveR2Key: string; snapshotId: string }) => Promise<void>;
  createSnapshotArchiveBuffer: (entries: SnapshotArchiveTarEntry[]) => Promise<Uint8Array>;
  snapshotUploadScheduler: SnapshotUploadScheduler | null;
  snapshotArchiveUploadScheduler: SnapshotArchiveUploadScheduler | null;
  upsertSnapshotFiles: (
    snapshotId: SnapshotId,
    files: {
      contentType?: string | null;
      fileHash: string;
      path: string;
      r2Key?: string | null;
      size: number;
      sourceSha?: string | null;
    }[],
  ) => Promise<void>;
  putSnapshotFileObject: (
    key: string,
    body: ArrayBuffer | Uint8Array,
    contentType?: string,
  ) => Promise<void>;
  deleteSnapshotFileObject: (key: string) => Promise<void>;
  uploadSnapshotFiles: (input: {
    files: { content: string; path: string }[];
    snapshotId: string;
  }) => Promise<{ workId: string }>;
}

const defaultDeps: SnapshotsServiceDeps = {
  buildSnapshotFilePublicUrl: () => {
    throw new Error("Snapshot storage is not configured.");
  },
  getSnapshotById: async (snapshotId) => {
    const { getSnapshotById } = await import("./repo");
    return await getSnapshotById(snapshotId);
  },
  getSnapshotBySkillAndVersion: async (input) => {
    const { getSnapshotBySkillAndVersion } = await import("./repo");
    return await getSnapshotBySkillAndVersion({
      skillId: asSkillId(input.skillId),
      version: input.version,
    });
  },
  createSnapshot: async (input) => {
    const { createSnapshot } = await import("./repo");
    return await createSnapshot({
      ...input,
      skillId: asSkillId(input.skillId),
    });
  },
  deprecateSnapshotsBeyondLimit: async (input) => {
    const { deprecateSnapshotsBeyondLimit } = await import("./repo");
    await deprecateSnapshotsBeyondLimit({
      ...input,
      skillId: asSkillId(input.skillId),
    });
  },
  fetchCommitSha: () => Promise.reject(new Error("Snapshot history is not configured.")),
  buildSkillTreeEntries: () => {
    throw new Error("Snapshot history is not configured.");
  },
  fetchSkillFilesForRoot: () => Promise.reject(new Error("Snapshot history is not configured.")),
  fetchTree: () => Promise.reject(new Error("Snapshot history is not configured.")),
  getSnapshotFileByPath: async (input) => {
    const { getSnapshotFileByPath } = await import("./repo");
    return await getSnapshotFileByPath(input);
  },
  getSnapshotBySkillAndCommit: () =>
    Promise.reject(new Error("Snapshot history is not configured.")),
  getSnapshotArchiveStagingObject: () =>
    Promise.reject(new Error("Snapshot archive staging storage is not configured.")),
  getSnapshotArchiveObject: () =>
    Promise.reject(new Error("Snapshot archive storage is not configured.")),
  getSnapshotStorageContext: async (snapshotId) => {
    const { getSnapshotStorageContext } = await import("./repo");
    return await getSnapshotStorageContext(snapshotId);
  },
  hasGithubToken: () => false,
  listSnapshotFiles: async (snapshotId) => {
    const { listSnapshotFiles } = await import("./repo");
    return await listSnapshotFiles(snapshotId);
  },
  listSnapshotsPageBySkill: async (input) => {
    const { listSnapshotsPageBySkill } = await import("./repo");
    return await listSnapshotsPageBySkill({
      ...input,
      skillId: asSkillId(input.skillId),
    });
  },
  listSkillsHistoryInfoByIds: async (skillIds) => {
    const { listSkillsHistoryInfoByIds } = await import("../skills/repo");
    return await listSkillsHistoryInfoByIds(skillIds.map((skillId) => asSkillId(skillId)));
  },
  readSnapshotFileObject: () => Promise.reject(new Error("Snapshot storage is not configured.")),
  putSnapshotArchiveObject: () =>
    Promise.reject(new Error("Snapshot archive storage is not configured.")),
  putSnapshotArchiveStagingObject: () =>
    Promise.reject(new Error("Snapshot archive staging storage is not configured.")),
  setSnapshotArchiveR2Key: async (input) => {
    const { setSnapshotArchiveR2Key } = await import("./repo");
    await setSnapshotArchiveR2Key(input);
  },
  createSnapshotArchiveBuffer: (entries) => createSnapshotArchiveBuffer(entries),
  snapshotUploadScheduler: null,
  snapshotArchiveUploadScheduler: null,
  upsertSnapshotFiles: () => Promise.reject(new Error("Snapshot file storage is not configured.")),
  putSnapshotFileObject: () =>
    Promise.reject(new Error("Snapshot file storage is not configured.")),
  deleteSnapshotFileObject: () =>
    Promise.reject(new Error("Snapshot file storage is not configured.")),
  uploadSnapshotFiles: () =>
    Promise.reject(new Error("Snapshot upload workflow is not configured.")),
};

type SnapshotStorageDeps = Pick<
  SnapshotStorageRuntime,
  "buildSnapshotFilePublicUrl" | "getSnapshotArchiveObject" | "getSnapshotFileObject"
>;

const normalizeSnapshotPath = (input: string) => {
  const replaced = input.replaceAll("\\", "/").trim();
  if (replaced.length === 0) {
    throw new Error("File path cannot be empty.");
  }

  const withoutLeadingSlash = replaced.replace(/^\/+/, "");
  if (withoutLeadingSlash.length === 0) {
    throw new Error("File path cannot be empty.");
  }

  const segments = withoutLeadingSlash.split("/").filter(Boolean);
  const stack: string[] = [];

  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (stack.length === 0) {
        throw new Error(`Invalid file path: ${input}`);
      }
      stack.pop();
      continue;
    }
    stack.push(segment);
  }

  if (stack.length === 0) {
    throw new Error(`Invalid file path: ${input}`);
  }

  return stack.join("/");
};

const getSnapshotFileByPathWithFallback = async (
  deps: Pick<SnapshotsServiceDeps, "getSnapshotById" | "getSnapshotFileByPath">,
  input: {
    path: string;
    snapshotId: SnapshotId;
  },
) => {
  const normalizedPath = normalizeSnapshotPath(input.path);
  const snapshot = await deps.getSnapshotById(input.snapshotId);
  const candidatePaths = [normalizedPath];

  if (snapshot?.directoryPath) {
    const rootedPath = toRootedSnapshotPath(snapshot.directoryPath, normalizedPath);
    if (!candidatePaths.includes(rootedPath)) {
      candidatePaths.push(rootedPath);
    }

    const normalizedDirectoryPath = normalizeSkillDirectoryRoot(snapshot.directoryPath);
    if (
      normalizedDirectoryPath.length > 0 &&
      normalizedPath.startsWith(`${normalizedDirectoryPath}/`)
    ) {
      const relativePath = normalizedPath.slice(normalizedDirectoryPath.length + 1);
      if (relativePath.length > 0 && !candidatePaths.includes(relativePath)) {
        candidatePaths.push(relativePath);
      }
    }
  }

  for (const path of candidatePaths) {
    const file = await deps.getSnapshotFileByPath({
      path,
      snapshotId: input.snapshotId,
    });
    if (file) {
      return file;
    }
  }

  return null;
};

const normalizeFiles = (directoryPath: string, files: { content: string; path: string }[]) => {
  const normalized: { content: string; path: string }[] = [];
  const seen = new Set<string>();
  const normalizedRoot = normalizeSkillDirectoryRoot(directoryPath);

  for (const file of files) {
    const trimmed = file.path.replaceAll("\\", "/").trim();
    const isRooted = trimmed.startsWith("/");
    const normalizedFilePath = normalizeSnapshotPath(file.path);

    if (
      isRooted &&
      normalizedFilePath !== normalizedRoot &&
      !normalizedFilePath.startsWith(`${normalizedRoot}/`)
    ) {
      throw new Error(`File path is outside the snapshot root: ${file.path}`);
    }

    const path = toRootedSnapshotPath(directoryPath, file.path);
    if (seen.has(path)) {
      throw new Error(`Duplicate file path detected: ${path}`);
    }
    seen.add(path);
    normalized.push({
      content: file.content,
      path,
    });
  }

  return normalized;
};

const normalizeSkillDirectoryRoot = (directoryPath: string) =>
  normalizeSnapshotPath(directoryPath).replace(/\/+$/, "");

const toRootedSnapshotPath = (rootPath: string, value: string) => {
  const normalizedPath = normalizeSnapshotPath(value);
  const normalizedRoot = normalizeSkillDirectoryRoot(rootPath);

  if (!normalizedRoot) {
    return normalizedPath;
  }

  if (normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return normalizedPath;
  }

  return `${normalizedRoot}/${normalizedPath}`;
};

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

const deriveHistoricalVersion = (latestVersion: string | undefined, offset: number) => {
  const defaultVersion = "1.0.0";
  if (!latestVersion || offset <= 0) {
    return defaultVersion;
  }

  const [majorValue, minorValue] = latestVersion
    .split(".")
    .slice(0, 2)
    .map((segment) => Number.parseInt(segment, 10));
  if (
    majorValue === undefined ||
    minorValue === undefined ||
    !(Number.isFinite(majorValue) && Number.isFinite(minorValue))
  ) {
    return defaultVersion;
  }

  const baseRank = Math.max(majorValue * 100 + minorValue, 0);
  const nextRank = Math.max(baseRank - offset, 0);
  return `${Math.floor(nextRank / 100)}.${nextRank % 100}.0`;
};

const normalizeTreeAndFiles = (
  rootPath: string,
  treeEntries: GitTreeEntry[],
  files: { content: string; path: string }[],
) => ({
  files: files.map((file) => ({
    ...file,
    path: toRootedSnapshotPath(rootPath, file.path),
  })),
  tree: treeEntries.map((entry) => ({
    ...entry,
    path: toRootedSnapshotPath(rootPath, entry.path),
  })),
});

const normalizeCommitSha = async (
  deps: Pick<SnapshotsServiceDeps, "fetchCommitSha">,
  input: {
    owner: string;
    repo: string;
    sha: string;
  },
) => {
  if (input.sha.length === 40) {
    return input.sha;
  }

  return await deps.fetchCommitSha({
    owner: input.owner,
    ref: input.sha,
    repo: input.repo,
  });
};

const hashText = async (value: string) => {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const getSnapshotFileContentType = (path: string) => {
  const lower = path.toLowerCase();
  if (lower.endsWith(".md")) {
    return "text/markdown; charset=utf-8";
  }
  if (lower.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  if (lower.endsWith(".ts")) {
    return "application/typescript; charset=utf-8";
  }
  if (lower.endsWith(".tsx")) {
    return "text/tsx; charset=utf-8";
  }
  if (lower.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) {
    return "application/yaml; charset=utf-8";
  }
  return "text/plain; charset=utf-8";
};

const toRelativeSnapshotPath = (directoryPath: string, normalizedPath: string) => {
  const directoryPrefix = directoryPath.endsWith("/") ? directoryPath : `${directoryPath}/`;
  if (!normalizedPath.startsWith(directoryPrefix)) {
    return normalizedPath;
  }
  const stripped = normalizedPath.slice(directoryPrefix.length);
  return stripped.length > 0 ? stripped : "SKILL.md";
};

const buildSnapshotFileR2Key = (
  storageContext: {
    directoryPath: string;
    repoName: string | null;
    repoOwner: string | null;
    version: string;
  } | null,
  snapshotId: string,
  normalizedPath: string,
) => {
  if (!(storageContext?.repoOwner && storageContext.repoName)) {
    return `snapshots/${snapshotId}/${normalizedPath}`;
  }

  const relativePath = toRelativeSnapshotPath(storageContext.directoryPath, normalizedPath);

  return [
    storageContext.repoOwner,
    storageContext.repoName,
    storageContext.directoryPath.replaceAll(/\/+$/g, ""),
    storageContext.version,
    relativePath,
  ]
    .filter((segment) => segment.length > 0)
    .join("/");
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

const buildSnapshotArchiveR2Key = async (
  deps: Pick<SnapshotsServiceDeps, "getSnapshotStorageContext">,
  snapshotId: SnapshotId,
) => {
  const storageContext = await deps.getSnapshotStorageContext(snapshotId);
  if (!(storageContext?.repoOwner && storageContext.repoName)) {
    return `${snapshotId}/skills.tar.gz`;
  }

  return [
    storageContext.repoOwner,
    storageContext.repoName,
    storageContext.directoryPath.replaceAll(/\/+$/g, ""),
    storageContext.version,
    "skills.tar.gz",
  ]
    .filter((segment) => segment.length > 0)
    .join("/");
};

export const createSnapshotsService = (overrides: Partial<SnapshotsServiceDeps> = {}) => {
  const deps = {
    ...defaultDeps,
    ...overrides,
  };

  const createHistoricalSnapshot = async (input: {
    description: string;
    directoryPath: string;
    entryPath: string;
    files: { content: string; path: string }[];
    name: string;
    skillId: string;
    sourceCommitDate?: number;
    sourceCommitMessage?: string | null;
    sourceCommitSha: string;
    sourceCommitUrl?: string | null;
    version: string;
  }) => {
    const existing = await deps.getSnapshotBySkillAndCommit({
      skillId: input.skillId,
      sourceCommitSha: input.sourceCommitSha,
    });
    if (existing) {
      return null;
    }

    const normalizedFiles = normalizeFiles(input.directoryPath, input.files);
    const snapshotId = await deps.createSnapshot({
      description: input.description,
      directoryPath: input.directoryPath,
      entryPath: input.entryPath,
      hash: await hashSnapshotFiles(normalizedFiles),
      name: input.name,
      skillId: input.skillId,
      sourceCommitDate: input.sourceCommitDate,
      sourceCommitMessage: input.sourceCommitMessage ?? null,
      sourceCommitSha: input.sourceCommitSha,
      sourceCommitUrl: input.sourceCommitUrl ?? null,
      syncTime: input.sourceCommitDate ?? Date.now(),
      version: input.version,
    });

    await deps.uploadSnapshotFiles({
      files: normalizedFiles,
      snapshotId,
    });
    await deps.deprecateSnapshotsBeyondLimit({
      keepLatest: 3,
      skillId: input.skillId,
    });

    return snapshotId;
  };

  return {
    async createHistoricalSnapshot(input: {
      description: string;
      directoryPath: string;
      entryPath: string;
      files: { content: string; path: string }[];
      name: string;
      skillId: string;
      sourceCommitDate?: number;
      sourceCommitMessage?: string | null;
      sourceCommitSha: string;
      sourceCommitUrl?: string | null;
      version: string;
    }) {
      return await createHistoricalSnapshot(input);
    },

    async getBySkillAndVersion(input: { skillId: string; version: string }) {
      return await deps.getSnapshotBySkillAndVersion(input);
    },

    async createSnapshotArchiveStaging(input: { snapshotId: string }) {
      const snapshotId = asSnapshotId(input.snapshotId);
      const snapshot = await deps.getSnapshotById(snapshotId);
      if (!snapshot) {
        throw new Error("Snapshot not found.");
      }

      const files = await deps.listSnapshotFiles(snapshotId);
      const filesWithR2Key = files.filter((file): file is typeof file & { r2Key: string } =>
        Boolean(file.r2Key),
      );
      if (filesWithR2Key.length === 0) {
        throw new Error("Snapshot files are not available in R2.");
      }

      const archiveFiles = await Promise.all(
        filesWithR2Key.map(async (file) => {
          const object = await deps.readSnapshotFileObject(file.r2Key);
          if (!object?.body) {
            throw new Error(`Snapshot file object missing for key: ${file.r2Key}`);
          }

          return {
            content: new Uint8Array(await object.arrayBuffer()),
            path: toRootedSnapshotPath(snapshot.directoryPath, file.path),
          };
        }),
      );
      const entries = buildSnapshotArchiveTarEntries({
        directoryPath: snapshot.directoryPath,
        files: archiveFiles,
      });
      const archiveBuffer = await deps.createSnapshotArchiveBuffer(entries);
      const archiveKey = await buildSnapshotArchiveR2Key(deps, snapshotId);
      const stagingKey = buildSnapshotArchiveStagingKey();

      await deps.putSnapshotArchiveStagingObject(stagingKey, archiveBuffer, "application/gzip");

      return {
        archiveBytes: archiveBuffer.byteLength,
        archiveKey,
        filesCount: entries.length,
        snapshotId: snapshot.id,
        stagingKey,
      };
    },

    async createHistoricalSnapshots(
      input: {
        commits: {
          committedDate?: string | null;
          message?: string | null;
          sha: string;
          url?: string | null;
        }[];
        repoName: string;
        repoOwner: string;
        skillIds: string[];
      },
      runtimeDeps?: Partial<
        Pick<
          SnapshotsServiceDeps,
          | "buildSkillTreeEntries"
          | "fetchCommitSha"
          | "fetchSkillFilesForRoot"
          | "fetchTree"
          | "hasGithubToken"
        >
      >,
    ) {
      const historyDeps = {
        ...deps,
        ...runtimeDeps,
      };

      if (!historyDeps.hasGithubToken()) {
        return null;
      }

      const skills = await historyDeps.listSkillsHistoryInfoByIds(input.skillIds);
      const commits = input.commits.slice(1, 3);
      if (skills.length === 0 || commits.length < 2) {
        return null;
      }

      const skillRoots = [
        ...new Set(skills.map((skill) => normalizeSkillDirectoryRoot(skill.directoryPath))),
      ];

      for (const [commitIndex, commit] of commits.entries()) {
        const commitSha = await normalizeCommitSha(historyDeps, {
          owner: input.repoOwner,
          repo: input.repoName,
          sha: commit.sha,
        });

        const tree = await historyDeps.fetchTree({
          commitSha,
          owner: input.repoOwner,
          repo: input.repoName,
        });
        const normalizedByRoot = new Map<string, ReturnType<typeof normalizeTreeAndFiles>>();

        for (const rootPath of skillRoots) {
          const treeEntries = historyDeps.buildSkillTreeEntries(tree, rootPath);
          const filesResponse = await historyDeps.fetchSkillFilesForRoot({
            owner: input.repoOwner,
            repo: input.repoName,
            skillRootPath: rootPath,
            tree,
          });
          normalizedByRoot.set(
            rootPath,
            normalizeTreeAndFiles(rootPath, treeEntries, filesResponse.files),
          );
        }

        for (const skill of skills) {
          const rootPath = normalizeSkillDirectoryRoot(skill.directoryPath);
          const normalized = normalizedByRoot.get(rootPath);
          if (!normalized) {
            continue;
          }

          const directoryPath = `${rootPath}/`;
          const filesForSkill = normalized.files.filter((file) =>
            file.path.startsWith(directoryPath),
          );
          if (filesForSkill.length === 0) {
            continue;
          }

          await createHistoricalSnapshot({
            description: skill.latestDescription,
            directoryPath,
            entryPath: skill.entryPath,
            files: filesForSkill,
            name: skill.latestName,
            skillId: skill.id,
            sourceCommitDate: commit.committedDate ? Date.parse(commit.committedDate) : undefined,
            sourceCommitMessage: truncateCommitMessage(commit.message),
            sourceCommitSha: commitSha,
            sourceCommitUrl: commit.url ?? undefined,
            version: deriveHistoricalVersion(skill.latestVersion, commitIndex + 1),
          });
        }
      }

      return null;
    },

    async uploadSnapshotArchiveFromStaging(input: {
      archiveBytes: number;
      archiveKey: string;
      filesCount: number;
      snapshotId: string;
      stagingKey: string;
    }) {
      const stagedArchive = await deps.getSnapshotArchiveStagingObject(input.stagingKey);
      if (!stagedArchive?.body) {
        throw new Error("Archive staging object not found.");
      }

      const archiveBuffer = new Uint8Array(await stagedArchive.arrayBuffer());
      await deps.putSnapshotArchiveObject(input.archiveKey, archiveBuffer, "application/gzip");
      await deps.setSnapshotArchiveR2Key({
        archiveR2Key: input.archiveKey,
        snapshotId: input.snapshotId,
      });

      return {
        archiveBytes: input.archiveBytes > 0 ? input.archiveBytes : archiveBuffer.byteLength,
        archiveKey: input.archiveKey,
        filesCount: input.filesCount,
        snapshotId: input.snapshotId,
      };
    },

    async getSnapshotDownloadManifest(input: { snapshotId: string }) {
      const files = await deps.listSnapshotFiles(asSnapshotId(input.snapshotId));
      return files
        .filter((file) => Boolean(file.r2Key))
        .map((file) => ({
          contentType: file.contentType ?? undefined,
          fileHash: file.fileHash,
          path: file.path,
          r2Key: file.r2Key ?? undefined,
          size: file.size,
          sourceSha: file.sourceSha ?? undefined,
        }));
    },

    async getSnapshotArchiveDownloadObject(input: { snapshotId: string }) {
      const snapshot = await deps.getSnapshotById(asSnapshotId(input.snapshotId));
      if (!snapshot?.archiveR2Key) {
        return null;
      }

      const object = await deps.getSnapshotArchiveObject(snapshot.archiveR2Key);
      if (!object?.body) {
        return null;
      }

      return {
        archiveKey: snapshot.archiveR2Key,
        object,
        snapshot,
      };
    },

    async getSnapshotFileSignedUrl(input: { snapshotId: string; path: string }) {
      const normalizedPath = normalizeSnapshotPath(input.path);
      const file = await getSnapshotFileByPathWithFallback(deps, {
        path: normalizedPath,
        snapshotId: asSnapshotId(input.snapshotId),
      });
      if (!file?.r2Key) {
        return null;
      }

      return {
        contentType: file.contentType ?? undefined,
        etag: file.fileHash,
        size: file.size,
        url: deps.buildSnapshotFilePublicUrl(file.r2Key),
      };
    },

    async getSnapshotTreeEntries(input: { snapshotId: string }) {
      const files = await deps.listSnapshotFiles(asSnapshotId(input.snapshotId));
      return files.map((file) => ({
        path: file.path,
        size: file.size,
        type: "blob" as const,
      }));
    },

    async listBySkill(input: { cursor?: string; limit?: number; skillId: string }) {
      const page = await deps.listSnapshotsPageBySkill({
        cursor: decodeCursor(input.cursor),
        limit: input.limit,
        skillId: input.skillId,
      });

      return {
        continueCursor: encodeCursor(page.nextCursor),
        isDone: page.isDone,
        page: page.page,
      };
    },

    async readSnapshotFileContent(input: {
      maxBytes?: number;
      offset?: number;
      path: string;
      snapshotId: string;
    }) {
      const normalizedPath = normalizeSnapshotPath(input.path);
      const offset = input.offset ?? 0;
      const maxBytes = Math.min(input.maxBytes ?? 20_000, 200_000);
      const file = await getSnapshotFileByPathWithFallback(deps, {
        path: normalizedPath,
        snapshotId: asSnapshotId(input.snapshotId),
      });

      if (!file?.r2Key) {
        throw new Error("File not found in snapshot.");
      }

      const object = await deps.readSnapshotFileObject(file.r2Key, {
        length: maxBytes,
        offset,
      });
      if (!object?.body) {
        throw new Error("File content is not available.");
      }

      const contentBuffer = await object.arrayBuffer();
      const bytesRead = contentBuffer.byteLength;
      const totalBytes = file.size;
      const isTruncated = offset + bytesRead < totalBytes;

      return {
        bytesRead,
        content: new TextDecoder().decode(contentBuffer),
        isTruncated,
        offset,
        totalBytes,
      };
    },

    async uploadSnapshotFiles(
      input: {
        files: {
          content: string;
          path: string;
        }[];
        snapshotId: string;
      },
      scheduler?: SnapshotUploadScheduler | null,
    ) {
      const activeScheduler = scheduler ?? deps.snapshotUploadScheduler;
      if (!activeScheduler) {
        throw new Error("Snapshot upload workflow is not configured.");
      }

      return await activeScheduler.enqueue(input);
    },

    async runUploadSnapshotFilesPipeline(input: {
      files: { content: string; path: string }[];
      snapshotId: string;
    }) {
      const snapshot = await deps.getSnapshotById(asSnapshotId(input.snapshotId));
      if (!snapshot) {
        throw new Error("Snapshot not found.");
      }

      const storageContext = await deps.getSnapshotStorageContext(asSnapshotId(input.snapshotId));
      const normalizedFiles = normalizeFiles(snapshot.directoryPath, input.files);

      const manifest: {
        contentType: string;
        fileHash: string;
        path: string;
        r2Key: string;
        size: number;
      }[] = [];

      for (const file of normalizedFiles) {
        const normalizedPath = file.path;
        const fileHash = await hashText(file.content);
        const r2Key = buildSnapshotFileR2Key(storageContext, input.snapshotId, normalizedPath);
        const contentType = getSnapshotFileContentType(normalizedPath);
        const bytes = new TextEncoder().encode(file.content);

        await deps.putSnapshotFileObject(r2Key, bytes, contentType);
        manifest.push({
          contentType,
          fileHash,
          path: normalizedPath,
          r2Key,
          size: bytes.byteLength,
        });
      }

      try {
        await deps.upsertSnapshotFiles(asSnapshotId(input.snapshotId), manifest);
      } catch (error) {
        const existingFiles = await deps.listSnapshotFiles(asSnapshotId(input.snapshotId));
        const existingR2KeyByPath = new Map(
          existingFiles
            .filter((file): file is typeof file & { r2Key: string } => Boolean(file.r2Key))
            .map((file) => [file.path, file.r2Key] as const),
        );
        const toDelete = manifest.filter(
          (entry) => existingR2KeyByPath.get(entry.path) !== entry.r2Key,
        );
        await Promise.allSettled(
          toDelete.map((entry) => deps.deleteSnapshotFileObject(entry.r2Key)),
        );
        throw error;
      }

      if (deps.snapshotArchiveUploadScheduler) {
        await deps.snapshotArchiveUploadScheduler.enqueue({ snapshotId: input.snapshotId });
      }

      return {
        filesCount: input.files.length,
        snapshotId: input.snapshotId,
      };
    },
  };
};

export type HistoricalSnapshotRunnerDeps = Pick<
  SnapshotsServiceDeps,
  "getSnapshotBySkillAndCommit" | "uploadSnapshotFiles"
> &
  Partial<Pick<SnapshotsServiceDeps, "createSnapshot" | "deprecateSnapshotsBeyondLimit">>;

export const createHistoricalSnapshotRunner = (overrides: HistoricalSnapshotRunnerDeps) => {
  const service = createSnapshotsService(overrides);
  return service.createHistoricalSnapshot;
};

const createSnapshotServiceWithStorage = (snapshotStorage?: SnapshotStorageDeps) =>
  snapshotStorage
    ? createSnapshotsService({
        buildSnapshotFilePublicUrl: snapshotStorage.buildSnapshotFilePublicUrl,
        getSnapshotArchiveObject: snapshotStorage.getSnapshotArchiveObject,
        readSnapshotFileObject: snapshotStorage.getSnapshotFileObject,
      })
    : snapshotsService;

export const snapshotsService = createSnapshotsService();

export const getBySkillAndVersion = (input: { skillId: string; version: string }) =>
  snapshotsService.getBySkillAndVersion(input);

export const createSnapshotArchiveStaging = (input: { snapshotId: string }) =>
  snapshotsService.createSnapshotArchiveStaging(input);

export const getSnapshotDownloadManifest = (input: { snapshotId: string }) =>
  snapshotsService.getSnapshotDownloadManifest(input);

export const getSnapshotArchiveDownloadObject = (
  input: { snapshotId: string },
  snapshotStorage?: SnapshotStorageDeps,
) => createSnapshotServiceWithStorage(snapshotStorage).getSnapshotArchiveDownloadObject(input);

export const getSnapshotFileSignedUrl = (
  input: { path: string; snapshotId: string },
  snapshotStorage?: SnapshotStorageDeps,
) => createSnapshotServiceWithStorage(snapshotStorage).getSnapshotFileSignedUrl(input);

export const getSnapshotTreeEntries = (input: { snapshotId: string }) =>
  snapshotsService.getSnapshotTreeEntries(input);

export const listBySkill = (input: { cursor?: string; limit?: number; skillId: string }) =>
  snapshotsService.listBySkill(input);

export const readSnapshotFileContent = (
  input: {
    maxBytes?: number;
    offset?: number;
    path: string;
    snapshotId: string;
  },
  snapshotStorage?: SnapshotStorageDeps,
) => createSnapshotServiceWithStorage(snapshotStorage).readSnapshotFileContent(input);

export const createHistoricalSnapshots = (
  input: {
    commits: {
      committedDate?: string | null;
      message?: string | null;
      sha: string;
      url?: string | null;
    }[];
    repoName: string;
    repoOwner: string;
    skillIds: string[];
  },
  runtimeDeps?: Partial<
    Pick<
      SnapshotsServiceDeps,
      | "buildSkillTreeEntries"
      | "fetchCommitSha"
      | "fetchSkillFilesForRoot"
      | "fetchTree"
      | "hasGithubToken"
    >
  >,
) => snapshotsService.createHistoricalSnapshots(input, runtimeDeps);

export const createHistoricalSnapshot = (input: {
  description: string;
  directoryPath: string;
  entryPath: string;
  files: {
    content: string;
    path: string;
  }[];
  name: string;
  skillId: string;
  sourceCommitDate?: number;
  sourceCommitMessage?: string | null;
  sourceCommitSha: string;
  sourceCommitUrl?: string | null;
  version: string;
}) => snapshotsService.createHistoricalSnapshot(input);

export const uploadSnapshotArchiveFromStaging = (input: {
  archiveBytes: number;
  archiveKey: string;
  filesCount: number;
  snapshotId: string;
  stagingKey: string;
}) => snapshotsService.uploadSnapshotArchiveFromStaging(input);

export const uploadSnapshotFiles = (
  input: {
    files: {
      content: string;
      path: string;
    }[];
    snapshotId: string;
  },
  scheduler?: SnapshotUploadScheduler | null,
) => snapshotsService.uploadSnapshotFiles(input, scheduler);
