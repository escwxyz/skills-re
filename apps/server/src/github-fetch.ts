import type { GithubFetchRuntime } from "@skills-re/api/types";

import {
  GITHUB_API_ROOT,
  buildGithubRepoOverview,
  createGithubHeaders,
  fetchGithubJson,
} from "./github-api";
import type { GithubRepoOverview } from "./github-api";
import { createGithubSnapshotHistoryHelpers } from "./github-history";
import { SKILL_FILENAME, discoverSkillRoots, parseFrontmatter } from "./github-skill-utils";
import { parseGithubRepoUrl } from "./github-url";

interface CreateGithubFetchRuntimeOptions {
  fetch?: typeof fetch;
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
        continue;
      }

      results[currentIndex] = await mapper(currentItem, currentIndex);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
};

const fetchRepoTree = async (
  fetchImpl: typeof fetch,
  headers: Headers,
  owner: string,
  repo: string,
  commitSha: string,
) => {
  const response = await fetchGithubJson<{
    truncated?: boolean;
    tree: { path: string; sha: string; size?: number; type: "blob" | "tree" | string }[];
  }>(
    fetchImpl,
    `${GITHUB_API_ROOT}/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`,
    {
      headers,
    },
    { includeResponseMessage: true },
  );

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
  env: Partial<Pick<Env, "GH_PAT">>,
  options: CreateGithubFetchRuntimeOptions = {},
): GithubFetchRuntime {
  const fetchImpl = options.fetch ?? fetch;
  const headers = createGithubHeaders(env);

  return {
    async fetchRepo(input) {
      const parsed = parseGithubRepoUrl(input.githubUrl);
      if (!parsed) {
        throw new Error("Invalid GitHub repository URL.");
      }

      const overview: GithubRepoOverview = await buildGithubRepoOverview(
        fetchImpl,
        headers,
        parsed.owner,
        parsed.repo,
        {
          branch: parsed.branch,
        },
      );

      const snapshotHelpers = createGithubSnapshotHistoryHelpers(env, {
        fetch: fetchImpl,
      });
      const { headSha } = overview;
      if (!headSha) {
        throw new Error("Unable to resolve repository HEAD commit.");
      }

      const tree = await fetchRepoTree(fetchImpl, headers, parsed.owner, parsed.repo, headSha);
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
