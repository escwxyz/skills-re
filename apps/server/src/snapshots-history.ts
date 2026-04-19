import type { GithubSnapshotHistoryHelpers, GithubSnapshotTreeEntry } from "@skills-re/api/types";

interface SnapshotHistoryInfo {
  directoryPath: string;
  entryPath: string;
  id: string;
  latestDescription: string;
  latestName: string;
  latestVersion: string;
}

export interface CreateSnapshotHistoryRuntimeDeps {
  createHistoricalSnapshot: (input: {
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
  }) => Promise<string | null>;
  githubHistory?: GithubSnapshotHistoryHelpers;
  listSkillsHistoryInfoByIds: (skillIds: string[]) => Promise<SnapshotHistoryInfo[]>;
}

const DEFAULT_INITIAL_VERSION = "1.0.0";
const MAX_COMMIT_MESSAGE_LENGTH = 280;

const truncateCommitMessage = (value: string | null | undefined) => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length <= MAX_COMMIT_MESSAGE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_COMMIT_MESSAGE_LENGTH - 1)}…`;
};

const deriveHistoricalVersion = (latestVersion: string | undefined, offset: number) => {
  if (!latestVersion || offset <= 0) {
    return DEFAULT_INITIAL_VERSION;
  }

  const parsed = latestVersion
    .split(".")
    .slice(0, 2)
    .map((segment) => Number.parseInt(segment, 10));
  const [major = Number.NaN, minor = Number.NaN] = parsed;
  if (!(Number.isFinite(major) && Number.isFinite(minor))) {
    return DEFAULT_INITIAL_VERSION;
  }

  const baseRank = Math.max(major * 100 + minor, 0);
  const nextRank = Math.max(baseRank - offset, 0);

  return `${Math.floor(nextRank / 100)}.${nextRank % 100}.0`;
};

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

const normalizeSkillDirectoryRoot = (directoryPath: string) =>
  normalizeRelativePath(directoryPath).replace(/^\/+/, "").replace(/\/+$/, "");

const toRootedSnapshotPath = (rootPath: string, value: string) => {
  const normalizedPath = normalizeRelativePath(value);
  const normalizedRoot = normalizeSkillDirectoryRoot(rootPath);

  if (!normalizedRoot) {
    return normalizedPath;
  }

  if (
    normalizedPath === normalizedRoot ||
    normalizedPath.startsWith(`${normalizedRoot}/`)
  ) {
    return normalizedPath;
  }

  return `${normalizedRoot}/${normalizedPath}`;
};

const normalizeTreeAndFiles = (
  rootPath: string,
  treeEntries: GithubSnapshotTreeEntry[],
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
  githubHistory: GithubSnapshotHistoryHelpers,
  input: {
    owner: string;
    repo: string;
    sha: string;
  },
) => {
  if (input.sha.length === 40) {
    return input.sha;
  }

  return await githubHistory.fetchCommitSha({
    owner: input.owner,
    ref: input.sha,
    repo: input.repo,
  });
};

export function createSnapshotsHistoryRuntime(deps: CreateSnapshotHistoryRuntimeDeps) {
  return {
    async createHistoricalSnapshots(input: {
      commits: {
        committedDate?: string | null;
        message?: string | null;
        sha: string;
        url?: string | null;
      }[];
      repoName: string;
      repoOwner: string;
      skillIds: string[];
    }) {
      const { githubHistory, listSkillsHistoryInfoByIds, createHistoricalSnapshot } = deps;
      if (!githubHistory) {
        return null;
      }

      if (!githubHistory.hasGithubToken()) {
        return null;
      }

      const skills = await listSkillsHistoryInfoByIds(input.skillIds);
      const commits = input.commits.slice(1, 3);
      if (skills.length === 0 || commits.length < 2) {
        return null;
      }

      const skillRoots = [
        ...new Set(skills.map((skill) => normalizeSkillDirectoryRoot(skill.directoryPath))),
      ];

      for (const [commitIndex, commit] of commits.entries()) {
        const commitSha = await normalizeCommitSha(githubHistory, {
          owner: input.repoOwner,
          repo: input.repoName,
          sha: commit.sha,
        });

        const tree = await githubHistory.fetchTree({
          commitSha,
          owner: input.repoOwner,
          repo: input.repoName,
        });
        const normalizedByRoot = new Map<string, ReturnType<typeof normalizeTreeAndFiles>>();

        for (const rootPath of skillRoots) {
          const treeEntries = githubHistory.buildSkillTreeEntries(tree, rootPath);
          const filesResponse = await githubHistory.fetchSkillFilesForRoot({
            owner: input.repoOwner,
            repo: input.repoName,
            skillRootPath: rootPath,
            tree,
          });
          normalizedByRoot.set(rootPath, normalizeTreeAndFiles(rootPath, treeEntries, filesResponse.files));
        }

        for (const skill of skills) {
          const rootPath = normalizeSkillDirectoryRoot(skill.directoryPath);
          const normalized = normalizedByRoot.get(rootPath);
          if (!normalized) {
            continue;
          }

          const directoryPath = rootPath.length > 0 ? `${rootPath}/` : rootPath;
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
            files: filesForSkill.map((file) => ({
              content: file.content,
              path: normalizeRelativePath(file.path),
            })),
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
  };
}
