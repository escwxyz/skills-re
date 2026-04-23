import type {
  GithubSnapshotTreeEntry,
  GithubSubmitRuntime,
  SkillsUploadContentPayload,
} from "@skills-re/api/types";

import {
  buildGithubRepoOverview,
  createGithubHeaders,
} from "./github-api";
import type { GithubRepoOverview } from "./github-api";
import { createGithubSnapshotHistoryHelpers } from "./github-history";
import {
  SKILL_FILENAME,
  discoverSkillRoots,
  normalizeSkillRootPath,
  parseFrontmatter,
} from "./github-skill-utils";


const isRepoIneligible = (overview: GithubRepoOverview) =>
  Boolean(
    overview.repo.isFork ||
      overview.repo.isArchived ||
      overview.repo.isDisabled ||
      overview.repo.isPrivate,
  );

const buildSubmitRepoPayload = (
  input: {
    owner: string;
    repo: string;
  },
  overview: GithubRepoOverview,
) => ({
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
});

const buildSubmitSkill = async (
  input: {
    owner: string;
    repo: string;
  },
  overview: GithubRepoOverview,
  headSha: string,
  tree: GithubSnapshotTreeEntry[],
  root: { skillMdPath: string; skillRootPath: string },
  snapshotHelpers: ReturnType<typeof createGithubSnapshotHistoryHelpers>,
) => {
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
    return null;
  }

  const frontmatter = parseFrontmatter(skillMd.content);
  if (!frontmatter) {
    return null;
  }

  const normalizedRoot = normalizeSkillRootPath(root.skillRootPath);
  return {
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
    sourceType: "github" as const,
    title: frontmatter.name,
  };
};

const buildPayloadFromOverview = async (input: {
  env: Partial<Pick<Env, "GH_PAT">>;
  fetchImpl: typeof fetch;
  owner: string;
  repo: string;
  requestedSkillPath?: string;
}) => {
  const snapshotHelpers = createGithubSnapshotHistoryHelpers(input.env, {
    fetch: input.fetchImpl,
  });
  const overview: GithubRepoOverview = await buildGithubRepoOverview(
    input.fetchImpl,
    createGithubHeaders(input.env),
    input.owner,
    input.repo,
    {
      includeLifecycleFlags: true,
    },
  );
  if (isRepoIneligible(overview)) {
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
    const skill = await buildSubmitSkill(input, overview, headSha, tree, root, snapshotHelpers);
    if (skill) {
      skills.push(skill);
    }
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
      repo: buildSubmitRepoPayload(input, overview),
      skills,
    },
    reason: undefined,
  };
};

export const createGithubSubmitRuntime = (
  env: Partial<Pick<Env, "GH_PAT">>,
  options: { fetch?: typeof fetch } = {},
): GithubSubmitRuntime => {
  const fetchImpl = options.fetch ?? fetch;

  return {
    async buildPayload(input) {
      return await buildPayloadFromOverview({
        fetchImpl,
        owner: input.owner,
        repo: input.repo,
        requestedSkillPath: input.skillRootPath,
        env,
      });
    },
  };
};
