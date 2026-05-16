import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import { asRepoId } from "@skills-re/db/utils";
import { listRepoSkillSnapshotHeadsByRepoId } from "@skills-re/api/modules/skills/repo";
import { findRepoByNameWithOwner } from "@skills-re/api/modules/repos/repo";

import { buildGithubRepoOverview, createGithubHeaders } from "../github-api";
import type { GithubRepoOverview } from "../github-api";
import { createGithubSnapshotHistoryHelpers } from "../github-history";
import { discoverSkillRoots, normalizeSkillRootPath } from "../github-skill-utils";
import type {
  RepoSkillImportWorkflowPayload,
  RepoSkillSnapshotSyncWorkflowPayload,
  RepoSkillsDiscoveryWorkflowPayload,
} from "./repo-skills-discovery";

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

interface WorkflowScheduler<TPayload> {
  enqueue(input: TPayload): Promise<{ workId: string }>;
}

interface RepoSkillSnapshotHead {
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
}

type RepoLookup = {
  id: string;
  updatedAt?: number | null;
} | null;

export interface RepoSkillsDiscoveryWorkflowDeps {
  fetchRepoOverview: (input: { owner: string; repo: string }) => Promise<{
    commits: {
      committedDate?: string | null;
      message?: string | null;
      sha: string;
      url?: string | null;
    }[];
    defaultBranch: string;
    headSha: string | null;
  }>;
  fetchTree: (input: {
    commitSha: string;
    owner: string;
    repo: string;
  }) => Promise<{ path: string; sha: string; size?: number; type: "blob" | "tree" }[]>;
  findRepoByNameWithOwner: (nameWithOwner: string) => Promise<RepoLookup>;
  importScheduler?: WorkflowScheduler<RepoSkillImportWorkflowPayload> | null;
  listRepoSkillSnapshotHeadsByRepoId: (repoId: string) => Promise<RepoSkillSnapshotHead[]>;
  snapshotSyncScheduler?: WorkflowScheduler<RepoSkillSnapshotSyncWorkflowPayload> | null;
}

const defaultDeps: RepoSkillsDiscoveryWorkflowDeps = {
  fetchRepoOverview: () =>
    Promise.reject(new Error("GitHub repo overview fetch is not configured.")),
  fetchTree: () => Promise.reject(new Error("GitHub tree fetch is not configured.")),
  findRepoByNameWithOwner,
  importScheduler: null,
  listRepoSkillSnapshotHeadsByRepoId: async (repoId) =>
    await listRepoSkillSnapshotHeadsByRepoId(asRepoId(repoId)),
  snapshotSyncScheduler: null,
};

export const createGithubRepoSkillsDiscoveryDeps = (
  env: Partial<Pick<Env, "GH_PAT">>,
  options: { fetch?: typeof fetch } = {},
): Pick<RepoSkillsDiscoveryWorkflowDeps, "fetchRepoOverview" | "fetchTree"> => {
  const fetchImpl = options.fetch ?? fetch;
  const headers = createGithubHeaders(env);
  const githubHistory = createGithubSnapshotHistoryHelpers(env, {
    fetch: fetchImpl,
  });

  return {
    async fetchRepoOverview(input) {
      const overview: GithubRepoOverview = await buildGithubRepoOverview(
        fetchImpl,
        headers,
        input.owner,
        input.repo,
        {
          includeLifecycleFlags: true,
        },
      );
      return {
        commits: overview.commits,
        defaultBranch: overview.defaultBranch,
        headSha: overview.headSha,
      };
    },
    async fetchTree(input) {
      return await githubHistory.fetchTree(input);
    },
  };
};

const normalizeDirectoryKey = (value: string) => normalizeSkillRootPath(value);

const scheduleImportJobs = async (
  scheduler: WorkflowScheduler<RepoSkillImportWorkflowPayload> | null | undefined,
  input: {
    repoName: string;
    repoOwner: string;
    roots: { skillRootPath: string }[];
  },
) => {
  if (!scheduler || input.roots.length === 0) {
    return 0;
  }

  await Promise.all(
    input.roots.map((root) =>
      scheduler.enqueue({
        repoName: input.repoName,
        repoOwner: input.repoOwner,
        skillRootPath: root.skillRootPath,
      }),
    ),
  );
  return input.roots.length;
};

const scheduleSnapshotJobs = async (
  scheduler: WorkflowScheduler<RepoSkillSnapshotSyncWorkflowPayload> | null | undefined,
  input: {
    expectedHeadSha: string;
    repoName: string;
    repoOwner: string;
    skills: { skillId: string; skillRootPath: string }[];
  },
) => {
  if (!scheduler || input.skills.length === 0) {
    return 0;
  }

  await Promise.all(
    input.skills.map((skill) =>
      scheduler.enqueue({
        expectedHeadSha: input.expectedHeadSha,
        repoName: input.repoName,
        repoOwner: input.repoOwner,
        skillId: skill.skillId,
        skillRootPath: skill.skillRootPath,
      }),
    ),
  );
  return input.skills.length;
};

export const runRepoSkillsDiscoveryWorkflow = async (
  event: Readonly<WorkflowEvent<RepoSkillsDiscoveryWorkflowPayload>>,
  step: WorkflowStep,
  deps: Partial<RepoSkillsDiscoveryWorkflowDeps> = {},
) => {
  const activeDeps = {
    ...defaultDeps,
    ...deps,
  };
  const { repoName, repoOwner } = event.payload;
  const repoNameWithOwner = `${repoOwner}/${repoName}`;

  const repo = await step.do(
    "load-repo",
    workflowStepRetryPolicy.repoSkillsDiscovery,
    async () => await activeDeps.findRepoByNameWithOwner(repoNameWithOwner),
  );
  if (!repo) {
    return {
      addedCount: 0,
      changedCount: 0,
      ignoredMissingCount: 0,
      reason: "repo-not-found",
      status: "skipped" as const,
      unchangedCount: 0,
    };
  }
  if (
    typeof event.payload.expectedUpdatedAt === "number" &&
    typeof repo.updatedAt === "number" &&
    repo.updatedAt > event.payload.expectedUpdatedAt
  ) {
    return {
      addedCount: 0,
      changedCount: 0,
      ignoredMissingCount: 0,
      reason: "stale-trigger",
      status: "skipped" as const,
      unchangedCount: 0,
    };
  }

  const overview = await step.do(
    "fetch-repo-overview",
    workflowStepRetryPolicy.repoSkillsDiscovery,
    async () => await activeDeps.fetchRepoOverview({ owner: repoOwner, repo: repoName }),
  );
  if (!overview.headSha) {
    return {
      addedCount: 0,
      changedCount: 0,
      ignoredMissingCount: 0,
      reason: "missing-head-sha",
      status: "skipped" as const,
      unchangedCount: 0,
    };
  }
  const { headSha } = overview;

  const [tree, existingSkills] = await Promise.all([
    step.do("fetch-repo-tree", workflowStepRetryPolicy.repoSkillsDiscovery, () =>
      activeDeps.fetchTree({
        commitSha: headSha,
        owner: repoOwner,
        repo: repoName,
      }),
    ),
    step.do("list-repo-skills", workflowStepRetryPolicy.repoSkillsDiscovery, () =>
      activeDeps.listRepoSkillSnapshotHeadsByRepoId(repo.id),
    ),
  ]);

  const discoveredRoots = discoverSkillRoots(tree);
  const discoveredByRoot = new Map(
    discoveredRoots.map((root) => [normalizeDirectoryKey(root.skillRootPath), root] as const),
  );
  const existingByRoot = new Map(
    existingSkills.map((skill) => [normalizeDirectoryKey(skill.directoryPath), skill] as const),
  );

  const addedRoots = discoveredRoots.filter(
    (root) => !existingByRoot.has(normalizeDirectoryKey(root.skillRootPath)),
  );
  const changedSkills = existingSkills
    .filter((skill) => discoveredByRoot.has(normalizeDirectoryKey(skill.directoryPath)))
    .filter((skill) => skill.latestSourceCommitSha !== headSha)
    .map((skill) => ({
      skillId: skill.skillId,
      skillRootPath: normalizeDirectoryKey(skill.directoryPath),
    }));
  const unchangedCount = existingSkills.filter(
    (skill) =>
      discoveredByRoot.has(normalizeDirectoryKey(skill.directoryPath)) &&
      skill.latestSourceCommitSha === headSha,
  ).length;
  const ignoredMissingCount = existingSkills.filter(
    (skill) => !discoveredByRoot.has(normalizeDirectoryKey(skill.directoryPath)),
  ).length;

  const [addedCount, changedCount] = await Promise.all([
    step.do("enqueue-new-skill-imports", workflowStepRetryPolicy.repoSkillsDiscoveryFanout, () =>
      scheduleImportJobs(activeDeps.importScheduler, {
        repoName,
        repoOwner,
        roots: addedRoots,
      }),
    ),
    step.do(
      "enqueue-changed-skill-snapshots",
      workflowStepRetryPolicy.repoSkillsDiscoveryFanout,
      () =>
        scheduleSnapshotJobs(activeDeps.snapshotSyncScheduler, {
          expectedHeadSha: headSha,
          repoName,
          repoOwner,
          skills: changedSkills,
        }),
    ),
  ]);

  return {
    addedCount,
    changedCount,
    headSha,
    ignoredMissingCount,
    status: "completed" as const,
    unchangedCount,
  };
};
