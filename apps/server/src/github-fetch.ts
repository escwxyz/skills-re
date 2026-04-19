import type { GithubFetchRuntime } from "@skills-re/api/types";

import { createGithubSnapshotHistoryHelpers } from "./github-history";
import { parseGithubRepoUrl } from "./github-url";

const GITHUB_API_ROOT = "https://api.github.com";
const SKILL_FILENAME = "skill.md";

interface CreateGithubFetchRuntimeOptions {
  fetch?: typeof fetch;
}

interface GithubRepoResponse {
  created_at?: string | null;
  default_branch: string;
  fork?: boolean;
  forks_count: number;
  full_name: string;
  html_url?: string | null;
  license?: { name?: string | null } | null;
  owner?: {
    avatar_url?: string | null;
    login?: string | null;
    name?: string | null;
  } | null;
  private?: boolean;
  stargazers_count: number;
  updated_at?: string | null;
}

interface GithubCommitResponse {
  commit?: {
    author?: { date?: string | null } | null;
    committer?: { date?: string | null } | null;
    message?: string | null;
  } | null;
  html_url?: string | null;
  sha: string;
}

interface ParsedFrontmatter {
  description: string;
  metadata?: Record<string, unknown>;
  name: string;
}

interface GithubFetchResult {
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
    files: { content: string; path: string }[];
    frontmatter: Record<string, unknown>;
    skillDescription: string;
    skillMdContent: string;
    skillMdPath: string;
    skillRootPath: string;
    skillTitle: string;
  }[];
  stargazerCount: number | null;
  tree: { path: string; sha: string; size?: number; type: "blob" | "tree" }[];
}

const getGithubToken = (env: Partial<Pick<Env, "GH_PAT" | "GITHUB_TOKEN">>) =>
  env.GH_PAT || env.GITHUB_TOKEN || null;

const buildHeaders = (token: string | null) => {
  const headers = new Headers({
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  });

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return headers;
};

const fetchJson = async <T>(fetchImpl: typeof fetch, input: string, init: RequestInit) => {
  const response = await fetchImpl(input, init);
  if (!response.ok) {
    throw new Error(`GitHub request failed with ${response.status} for ${input}`);
  }

  return (await response.json()) as T;
};

const parseFrontmatter = (content: string): ParsedFrontmatter | null => {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return null;
  }

  const lines = trimmed.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return null;
  }

  let closingIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") {
      closingIndex = index;
      break;
    }
  }

  if (closingIndex < 0) {
    return null;
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const result: Record<string, unknown> = {};
  for (const line of frontmatterLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }

    result[key] = value.replaceAll(/^['"]|['"]$/g, "");
  }

  const name = typeof result.name === "string" ? result.name.trim() : "";
  const description = typeof result.description === "string" ? result.description.trim() : "";
  if (!(name && description)) {
    return null;
  }

  return {
    description,
    metadata: Object.keys(result).length > 2 ? result : undefined,
    name,
  };
};

const discoverSkillRoots = (
  tree: { path: string; type: "blob" | "tree"; sha: string; size?: number }[],
  requestedSkillPath?: string,
) => {
  const requestedPath = requestedSkillPath?.trim() ?? "";
  const requestedPrefix = requestedPath.length > 0 ? `${requestedPath}/` : "";

  return tree
    .filter((entry) => entry.type === "blob")
    .filter((entry) => {
      if (!entry.path.toLowerCase().endsWith(`/${SKILL_FILENAME}`)) {
        return false;
      }
      if (!requestedPrefix.length) {
        return true;
      }
      return (
        entry.path === `${requestedPath}/${SKILL_FILENAME}` ||
        entry.path.startsWith(requestedPrefix)
      );
    })
    .map((entry) => ({
      skillMdPath: entry.path,
      skillRootPath: entry.path.split("/").slice(0, -1).join("/"),
    }));
};

const toOwnerName = (value: string | null | undefined) => value ?? null;

const mapWithConcurrency = async <T, U>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<U>,
) => {
  const results = Array.from({ length: items.length }, () => undefined as U);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) {
        return;
      }

      const currentItem = items[currentIndex];
      if (currentItem === undefined) {
        return;
      }

      results[currentIndex] = await mapper(currentItem, currentIndex);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
};

const buildRepoOverview = async (
  fetchImpl: typeof fetch,
  token: string | null,
  owner: string,
  repo: string,
  branch?: string,
) => {
  const headers = buildHeaders(token);
  const repoResponse = await fetchJson<GithubRepoResponse>(
    fetchImpl,
    `${GITHUB_API_ROOT}/repos/${owner}/${repo}`,
    { headers },
  );
  const commitsResponse = await fetchJson<GithubCommitResponse[]>(
    fetchImpl,
    `${GITHUB_API_ROOT}/repos/${owner}/${repo}/commits?per_page=2${
      branch ? `&sha=${encodeURIComponent(branch)}` : ""
    }`,
    { headers },
  );

  const defaultBranch = branch ?? repoResponse.default_branch;
  return {
    commits: commitsResponse.map((commit) => ({
      committedDate: commit.commit?.committer?.date ?? commit.commit?.author?.date ?? null,
      message: commit.commit?.message ?? null,
      sha: commit.sha,
      url: commit.html_url ?? null,
    })),
    defaultBranch,
    headSha: commitsResponse[0]?.sha ?? null,
    owner: {
      avatarUrl: repoResponse.owner?.avatar_url ?? null,
      handle: repoResponse.owner?.login ?? owner,
      name: toOwnerName(repoResponse.owner?.name),
    },
    repo: {
      createdAt: repoResponse.created_at ?? null,
      forkCount: repoResponse.forks_count ?? null,
      isArchived: null,
      isDisabled: null,
      isEmpty: null,
      isFork: repoResponse.fork ?? null,
      isPrivate: repoResponse.private ?? null,
      licenseName: repoResponse.license?.name ?? null,
      nameWithOwner: repoResponse.full_name ?? `${owner}/${repo}`,
      stargazerCount: repoResponse.stargazers_count ?? null,
      updatedAt: repoResponse.updated_at ?? null,
      url: repoResponse.html_url ?? null,
    },
  };
};

const fetchRepoTree = async (
  fetchImpl: typeof fetch,
  token: string | null,
  owner: string,
  repo: string,
  commitSha: string,
) => {
  const response = await fetchJson<{
    truncated?: boolean;
    tree: { path: string; sha: string; size?: number; type: "blob" | "tree" | string }[];
  }>(fetchImpl, `${GITHUB_API_ROOT}/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`, {
    headers: buildHeaders(token),
  });

  if (response.truncated) {
    throw new Error("Repository tree is too large to fetch.");
  }

  return response.tree
    .filter((entry) => entry.type === "blob" || entry.type === "tree")
    .map((entry) => ({
      path: entry.path,
      sha: entry.sha,
      size: entry.size,
      type: entry.type as "blob" | "tree",
    }));
};

export function createGithubFetchRuntime(
  env: Partial<Pick<Env, "GH_PAT" | "GITHUB_TOKEN">>,
  options: CreateGithubFetchRuntimeOptions = {},
): GithubFetchRuntime {
  const fetchImpl = options.fetch ?? fetch;
  const token = getGithubToken(env);

  return {
    async fetchRepo(input) {
      const parsed = parseGithubRepoUrl(input.githubUrl);
      if (!parsed) {
        throw new Error("Invalid GitHub repository URL.");
      }

      const overview = await buildRepoOverview(
        fetchImpl,
        token,
        parsed.owner,
        parsed.repo,
        parsed.branch,
      );

      const snapshotHelpers = createGithubSnapshotHistoryHelpers(env, {
        fetch: fetchImpl,
      });
      const { headSha } = overview;
      if (!headSha) {
        throw new Error("Unable to resolve repository HEAD commit.");
      }

      const tree = await fetchRepoTree(fetchImpl, token, parsed.owner, parsed.repo, headSha);
      const roots = discoverSkillRoots(tree, parsed.skillPath);

      const rootResults = await mapWithConcurrency(roots, 4, async (root) => {
        const filesResponse = await snapshotHelpers.fetchSkillFilesForRoot({
          owner: parsed.owner,
          repo: parsed.repo,
          skillRootPath: root.skillRootPath,
          tree,
        });
        const skillMd = filesResponse.files.find(
          (file) => file.path.split("/").at(-1)?.toLowerCase() === SKILL_FILENAME,
        );
        if (!skillMd) {
          return {
            kind: "invalid" as const,
            invalidSkill: {
              message: "Missing skill.md file.",
              skillMdPath: root.skillMdPath,
              skillRootPath: root.skillRootPath,
            },
          };
        }

        const frontmatter = parseFrontmatter(skillMd.content);
        if (!frontmatter) {
          return {
            kind: "invalid" as const,
            invalidSkill: {
              message: "Invalid skill frontmatter.",
              skillMdPath: skillMd.path,
              skillRootPath: root.skillRootPath,
            },
          };
        }

        return {
          kind: "valid" as const,
          skill: {
            files: filesResponse.files,
            frontmatter: frontmatter.metadata ?? {
              description: frontmatter.description,
              name: frontmatter.name,
            },
            skillDescription: frontmatter.description,
            skillMdContent: skillMd.content,
            skillMdPath: root.skillMdPath,
            skillRootPath: root.skillRootPath,
            skillTitle: frontmatter.name,
          },
        };
      });

      const skills: GithubFetchResult["skills"] = [];
      const invalidSkills: GithubFetchResult["invalidSkills"] = [];

      for (const result of rootResults) {
        if (result.kind === "valid") {
          skills.push(result.skill);
          continue;
        }

        invalidSkills.push(result.invalidSkill);
      }

      return {
        branch: overview.defaultBranch,
        commitDate: overview.commits[0]?.committedDate ?? null,
        commitMessage: overview.commits[0]?.message ?? null,
        commitSha: headSha,
        forkCount: overview.repo.forkCount,
        invalidSkills,
        licenseInfo: overview.repo.licenseName ? { name: overview.repo.licenseName } : null,
        nameWithOwner: overview.repo.nameWithOwner,
        owner: parsed.owner,
        ownerAvatarUrl: overview.owner.avatarUrl,
        ownerHandle: overview.owner.handle,
        ownerName: overview.owner.name,
        recentCommits: overview.commits,
        repo: parsed.repo,
        repoCreatedAt: overview.repo.createdAt,
        repoUpdatedAt: overview.repo.updatedAt,
        repoUrl: overview.repo.url,
        requestedSkillPath: parsed.skillPath ?? null,
        skills,
        stargazerCount: overview.repo.stargazerCount,
        tree,
      };
    },
  };
}
