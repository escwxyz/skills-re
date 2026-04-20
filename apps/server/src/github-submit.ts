import type {
  GithubSnapshotTreeEntry,
  GithubSubmitRuntime,
  SkillsUploadContentPayload,
} from "@skills-re/api/types";

import { createGithubSnapshotHistoryHelpers } from "./github-history";

const GITHUB_API_ROOT = "https://api.github.com";
const SKILL_FILENAME = "skill.md";

interface GithubRepoResponse {
  archived?: boolean;
  default_branch: string;
  disabled?: boolean;
  fork?: boolean;
  forks_count: number;
  full_name: string;
  html_url?: string;
  license?: { name?: string | null } | null;
  owner?: {
    avatar_url?: string | null;
    login?: string | null;
    name?: string | null;
  } | null;
  private?: boolean;
  stargazers_count: number;
  updated_at?: string | null;
  created_at?: string | null;
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

// interface GithubBlobResponse {
//   content: string;
//   encoding: string;
// }

interface ParsedFrontmatter {
  description: string;
  metadata?: Record<string, string>;
  name: string;
}

const normalizeRelativePath = (value: string) => {
  const segments: string[] = [];
  for (const rawSegment of value.split("/")) {
    const segment = rawSegment.trim();
    if (!segment || segment === ".") {
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

const normalizeSkillRootPath = (value: string) =>
  normalizeRelativePath(value).replace(/^\/+/, "").replace(/\/+$/, "");

const getGithubToken = (env: Partial<Pick<Env, "GH_PAT" | "GITHUB_TOKEN">>) =>
  env.GH_PAT || env.GITHUB_TOKEN || null;

const fetchJson = async <T>(fetchImpl: typeof fetch, input: string, init: RequestInit) => {
  const response = await fetchImpl(input, init);
  if (!response.ok) {
    throw new Error(`GitHub request failed with ${response.status} for ${input}`);
  }

  return (await response.json()) as T;
};

// const decodeBase64 = (value: string) => {
//   if (typeof Buffer !== "undefined") {
//     return Buffer.from(value, "base64").toString("utf-8");
//   }

//   return atob(value);
// };

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
  const result: Record<string, string> = {};

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

  if (!result.name || !result.description) {
    return null;
  }

  return {
    description: result.description,
    metadata: Object.keys(result).length > 2 ? result : undefined,
    name: result.name,
  };
};

const discoverSkillRoots = (tree: GithubSnapshotTreeEntry[], requestedSkillPath?: string) => {
  const requestedPath = requestedSkillPath ? normalizeSkillRootPath(requestedSkillPath) : "";
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

/* oxlint-disable complexity */
const buildRepoOverview = async (
  fetchImpl: typeof fetch,
  token: string | null,
  owner: string,
  repo: string,
) => {
  const headers = buildHeaders(token);
  const repoResponse = await fetchJson<GithubRepoResponse>(
    fetchImpl,
    `${GITHUB_API_ROOT}/repos/${owner}/${repo}`,
    { headers },
  );
  const commitsResponse = await fetchJson<GithubCommitResponse[]>(
    fetchImpl,
    `${GITHUB_API_ROOT}/repos/${owner}/${repo}/commits?per_page=2`,
    { headers },
  );

  const defaultBranch = repoResponse.default_branch;
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
      name: repoResponse.owner?.name ?? null,
    },
    repo: {
      createdAt: repoResponse.created_at ?? null,
      forkCount: repoResponse.forks_count ?? null,
      isArchived: repoResponse.archived ?? null,
      isDisabled: repoResponse.disabled ?? null,
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

const buildPayloadFromOverview = async (input: {
  env: Partial<Pick<Env, "GH_PAT" | "GITHUB_TOKEN">>;
  fetchImpl: typeof fetch;
  owner: string;
  repo: string;
  requestedSkillPath?: string;
  token: string | null;
}) => {
  const snapshotHelpers = createGithubSnapshotHistoryHelpers(input.env, {
    fetch: input.fetchImpl,
  });
  const overview = await buildRepoOverview(input.fetchImpl, input.token, input.owner, input.repo);
  if (
    overview.repo.isFork ||
    overview.repo.isArchived ||
    overview.repo.isDisabled ||
    overview.repo.isPrivate
  ) {
    return {
      payload: null,
      reason: "repo-ineligible",
    };
  }

  const { headSha } = overview;
  if (!headSha) {
    return {
      payload: null,
      reason: "missing-head-sha",
    };
  }

  const tree = await snapshotHelpers.fetchTree({
    commitSha: headSha,
    owner: input.owner,
    repo: input.repo,
  });
  const roots = discoverSkillRoots(tree, input.requestedSkillPath);
  if (roots.length === 0) {
    return {
      payload: null,
      reason: "no-skills",
    };
  }

  const skills: SkillsUploadContentPayload["skills"] = [];
  for (const root of roots) {
    const filesResponse = await snapshotHelpers.fetchSkillFilesForRoot({
      owner: input.owner,
      repo: input.repo,
      skillRootPath: root.skillRootPath,
      tree,
    });
    const skillMd = filesResponse.files.find(
      (file) => file.path.split("/").at(-1)?.toLowerCase() === SKILL_FILENAME,
    );
    if (!skillMd) {
      continue;
    }

    const frontmatter = parseFrontmatter(skillMd.content);
    if (!frontmatter) {
      continue;
    }

    const normalizedRoot = normalizeSkillRootPath(root.skillRootPath);
    skills.push({
      description: frontmatter.description,
      directoryPath: normalizedRoot.length > 0 ? `${normalizedRoot}/` : normalizedRoot,
      entryPath: skillMd.path,
      initialSnapshot: {
        files: filesResponse.files,
        sourceCommitDate: Date.parse(overview.commits[0]?.committedDate ?? "") || Date.now(),
        sourceCommitMessage: overview.commits[0]?.message ?? undefined,
        sourceCommitSha: overview.commits[0]?.sha ?? headSha,
        sourceCommitUrl: overview.commits[0]?.url ?? undefined,
        sourceRef: overview.defaultBranch,
        tree: snapshotHelpers.buildSkillTreeEntries(tree, root.skillRootPath),
      },
      license: overview.repo.licenseName ?? undefined,
      slug: frontmatter.name,
      sourceLocator: `github:${input.owner}/${input.repo}/${skillMd.path}`,
      sourceType: "github",
      title: frontmatter.name,
    });
  }

  if (skills.length === 0) {
    return {
      payload: null,
      reason: "no-valid-skills",
    };
  }

  return {
    payload: {
      recentCommits: overview.commits,
      repo: {
        createdAt: Date.parse(overview.repo.createdAt ?? "") || Date.now(),
        defaultBranch: overview.defaultBranch,
        forks: overview.repo.forkCount ?? 0,
        license: overview.repo.licenseName ?? "Unknown",
        nameWithOwner: overview.repo.nameWithOwner ?? `${input.owner}/${input.repo}`,
        owner: {
          avatarUrl: overview.owner.avatarUrl ?? undefined,
          handle: overview.owner.handle,
          name: overview.owner.name ?? undefined,
        },
        stars: overview.repo.stargazerCount ?? 0,
        updatedAt: Date.parse(overview.repo.updatedAt ?? "") || Date.now(),
      },
      skills,
    },
    reason: undefined,
  };
};
/* oxlint-enable complexity */

export const createGithubSubmitRuntime = (
  env: Partial<Pick<Env, "GH_PAT" | "GITHUB_TOKEN">>,
  options: { fetch?: typeof fetch } = {},
): GithubSubmitRuntime => {
  const fetchImpl = options.fetch ?? fetch;
  const token = getGithubToken(env);

  return {
    async buildPayload(input) {
      return await buildPayloadFromOverview({
        fetchImpl,
        owner: input.owner,
        repo: input.repo,
        requestedSkillPath: input.skillRootPath,
        env,
        token,
      });
    },
  };
};
