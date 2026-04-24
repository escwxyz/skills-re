import type { GithubSnapshotTreeEntry, GithubSubmitRuntime } from "@skills-re/api/types";

import { buildGithubRepoOverview, createGithubHeaders } from "./github-api";
import type { GithubRepoOverview } from "./github-api";
import { createGithubSnapshotHistoryHelpers } from "./github-history";
import {
  SKILL_FILENAME,
  discoverSkillRoots,
  normalizeSkillRootPath,
  parseFrontmatter,
} from "./github-skill-utils";
import type { WorkerLogger } from "./worker-logger";

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
  logger?: WorkerLogger,
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
    logger?.debug("github.submit.skill.skipped", {
      reason: "no-skill-md",
      skillRootPath: root.skillRootPath,
    });
    return null;
  }

  const frontmatter = parseFrontmatter(skillMd.content);
  if (!frontmatter) {
    logger?.warn("github.submit.skill.skipped", {
      reason: "invalid-frontmatter",
      skillMdPath: root.skillMdPath,
    });
    return null;
  }

  const normalizedRoot = normalizeSkillRootPath(root.skillRootPath);
  return {
    description: frontmatter.description,
    directoryPath: normalizedRoot.length > 0 ? `${normalizedRoot}/` : normalizedRoot,
    entryPath: root.skillMdPath,
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
    sourceLocator: `github:${input.owner}/${input.repo}/${root.skillMdPath}`,
    sourceType: "github" as const,
    title: frontmatter.name,
  };
};

const buildPayloadFromOverview = async (input: {
  env: Partial<Pick<Env, "GH_PAT">>;
  fetchImpl: typeof fetch;
  logger?: WorkerLogger;
  owner: string;
  repo: string;
  requestedSkillPath?: string;
}) => {
  const log = input.logger?.child({ owner: input.owner, repo: input.repo });
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
    log?.warn("github.submit.rejected", { reason: "repo-ineligible" });
    return {
      payload: null,
      reason: "repo-ineligible",
    };
  }

  const { headSha } = overview;
  if (!headSha) {
    log?.warn("github.submit.rejected", { reason: "missing-head-sha" });
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
    log?.warn("github.submit.rejected", { reason: "no-skills" });
    return {
      payload: null,
      reason: "no-skills",
    };
  }

  const skillResults = await Promise.all(
    roots.map((root) =>
      buildSubmitSkill(input, overview, headSha, tree, root, snapshotHelpers, log),
    ),
  );
  const skills = skillResults.filter((skill): skill is NonNullable<typeof skill> => skill !== null);

  if (skills.length === 0) {
    log?.warn("github.submit.rejected", { reason: "no-valid-skills" });
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
  options: { fetch?: typeof fetch; logger?: WorkerLogger } = {},
): GithubSubmitRuntime => {
  const fetchImpl = options.fetch ?? fetch;

  return {
    async buildPayload(input) {
      return await buildPayloadFromOverview({
        env,
        fetchImpl,
        logger: options.logger,
        owner: input.owner,
        repo: input.repo,
        requestedSkillPath: input.skillRootPath,
      });
    },
  };
};
