import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import {
  createSnapshot,
  deprecateSnapshotsBeyondLimit,
  setSkillLatestSnapshot,
} from "@skills-re/api/modules/snapshots/repo";
import { findRepoByNameWithOwner } from "@skills-re/api/modules/repos/repo";
import { listRepoSkillSnapshotHeadsByRepoId } from "@skills-re/api/modules/skills/repo";
import {
  hashSnapshotFiles,
  normalizeUploadDirectoryPath,
  truncateUploadCommitMessage,
} from "@skills-re/api/modules/skills/upload-pipeline";
import { buildSkillDuplicateFingerprintFromSkillMd, SKILL_FILENAME } from "../github-skill-utils";
import { asRepoId, asSkillId, asSnapshotId } from "@skills-re/db/utils";

import type { RepoSkillSnapshotSyncWorkflowPayload } from "./repo-skills-discovery";

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

interface RepoOverviewCommit {
  committedDate?: string | null;
  message?: string | null;
  sha: string;
  url?: string | null;
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

export interface RepoSkillSnapshotSyncWorkflowDeps {
  createSnapshot: (input: {
    description: string;
    directoryPath: string;
    entryPath: string;
    frontmatterHash?: string | null;
    hash: string;
    name: string;
    skillContentHash?: string | null;
    skillId: string;
    sourceCommitDate?: number;
    sourceCommitMessage?: string | null;
    sourceCommitSha: string;
    sourceCommitUrl?: string | null;
    syncTime: number;
    version: string;
  }) => Promise<string>;
  deprecateSnapshotsBeyondLimit: (input: {
    keepLatest: number;
    skillId: string;
  }) => Promise<unknown>;
  fetchRepoOverview: (input: { owner: string; repo: string }) => Promise<{
    commits: RepoOverviewCommit[];
    defaultBranch: string;
    headSha: string | null;
  }>;
  fetchSkillFilesForRoot: (input: {
    owner: string;
    repo: string;
    skillRootPath: string;
    tree: { path: string; sha: string; size?: number; type: "blob" | "tree" }[];
  }) => Promise<{ files: { content: string; path: string }[] }>;
  fetchTree: (input: {
    commitSha: string;
    owner: string;
    repo: string;
  }) => Promise<{ path: string; sha: string; size?: number; type: "blob" | "tree" }[]>;
  findRepoByNameWithOwner: (nameWithOwner: string) => Promise<RepoLookup>;
  listRepoSkillSnapshotHeadsByRepoId: (repoId: string) => Promise<RepoSkillSnapshotHead[]>;
  setSkillLatestSnapshot: (input: {
    latestCommitDate?: number | null;
    latestCommitMessage?: string | null;
    latestCommitSha?: string | null;
    latestCommitUrl?: string | null;
    skillId: string;
    snapshotId: string;
    version: string;
  }) => Promise<unknown>;
  uploadSnapshotFiles: (input: {
    files: { content: string; path: string }[];
    snapshotId: string;
  }) => Promise<{ workId: string }>;
}

const defaultDeps: RepoSkillSnapshotSyncWorkflowDeps = {
  createSnapshot: async (input) =>
    await createSnapshot({ ...input, skillId: asSkillId(input.skillId) }),
  deprecateSnapshotsBeyondLimit: async (input) =>
    await deprecateSnapshotsBeyondLimit({ ...input, skillId: asSkillId(input.skillId) }),
  fetchRepoOverview: () =>
    Promise.reject(new Error("GitHub repo overview fetch is not configured.")),
  fetchSkillFilesForRoot: () => Promise.reject(new Error("GitHub file fetch is not configured.")),
  fetchTree: () => Promise.reject(new Error("GitHub tree fetch is not configured.")),
  findRepoByNameWithOwner,
  listRepoSkillSnapshotHeadsByRepoId: async (repoId) =>
    await listRepoSkillSnapshotHeadsByRepoId(asRepoId(repoId)),
  setSkillLatestSnapshot: async (input) =>
    await setSkillLatestSnapshot({
      ...input,
      skillId: asSkillId(input.skillId),
      snapshotId: asSnapshotId(input.snapshotId),
    }),
  uploadSnapshotFiles: () =>
    Promise.reject(new Error("Snapshot upload workflow is not configured.")),
};

const deriveNextSnapshotVersion = (latestVersion: string) => {
  const segments = latestVersion.split(".").map((segment) => Number.parseInt(segment, 10));
  const major = segments[0] ?? 0;
  const minor = segments[1] ?? 0;
  const patch = segments[2] ?? 0;

  if (!(Number.isFinite(major) && Number.isFinite(minor) && Number.isFinite(patch))) {
    return "0.0.1";
  }

  return `${major}.${minor}.${patch + 1}`;
};

export const runRepoSkillSnapshotSyncWorkflow = async (
  event: Readonly<WorkflowEvent<RepoSkillSnapshotSyncWorkflowPayload>>,
  step: WorkflowStep,
  deps: Partial<RepoSkillSnapshotSyncWorkflowDeps> = {},
) => {
  const activeDeps = {
    ...defaultDeps,
    ...deps,
  };
  const { repoName, repoOwner, skillId, skillRootPath } = event.payload;
  const repoNameWithOwner = `${repoOwner}/${repoName}`;

  const repo = await step.do(
    "load-repo",
    workflowStepRetryPolicy.repoSkillSnapshotSync,
    async () => await activeDeps.findRepoByNameWithOwner(repoNameWithOwner),
  );
  if (!repo) {
    return { reason: "repo-not-found", status: "skipped" as const };
  }

  const overview = await step.do(
    "fetch-repo-overview",
    workflowStepRetryPolicy.repoSkillSnapshotSync,
    async () => await activeDeps.fetchRepoOverview({ owner: repoOwner, repo: repoName }),
  );
  const [headCommit] = overview.commits;
  if (!(overview.headSha && headCommit)) {
    return { reason: "missing-head-commit", status: "skipped" as const };
  }
  const { headSha } = overview;
  if (headSha !== event.payload.expectedHeadSha) {
    return { reason: "stale-trigger", status: "skipped" as const };
  }

  const existingSkills = await step.do(
    "list-repo-skills",
    workflowStepRetryPolicy.repoSkillSnapshotSync,
    async () => await activeDeps.listRepoSkillSnapshotHeadsByRepoId(repo.id),
  );
  const skill = existingSkills.find((entry) => entry.skillId === skillId);
  if (!skill) {
    return { reason: "skill-not-found", status: "skipped" as const };
  }
  if (skill.latestSourceCommitSha === headSha) {
    return { reason: "unchanged-commit", status: "skipped" as const };
  }

  const tree = await step.do(
    "fetch-repo-tree",
    workflowStepRetryPolicy.repoSkillSnapshotSync,
    async () =>
      await activeDeps.fetchTree({
        commitSha: headSha,
        owner: repoOwner,
        repo: repoName,
      }),
  );
  const filesResponse = await step.do(
    "fetch-skill-files",
    workflowStepRetryPolicy.repoSkillSnapshotSync,
    async () =>
      await activeDeps.fetchSkillFilesForRoot({
        owner: repoOwner,
        repo: repoName,
        skillRootPath,
        tree,
      }),
  );
  if (filesResponse.files.length === 0) {
    return { reason: "missing-skill-files", status: "skipped" as const };
  }

  const nextHash = await hashSnapshotFiles(filesResponse.files);
  if (nextHash === skill.latestHash) {
    return { reason: "unchanged-hash", status: "skipped" as const };
  }

  const relativeEntryPath = skill.entryPath.startsWith(`${skillRootPath}/`)
    ? skill.entryPath.slice(skillRootPath.length + 1)
    : (skill.entryPath.split("/").at(-1) ?? SKILL_FILENAME);
  const skillMdFile = filesResponse.files.find(
    (f) => f.path === relativeEntryPath || f.path.split("/").at(-1) === SKILL_FILENAME,
  );
  const fingerprint = skillMdFile
    ? await buildSkillDuplicateFingerprintFromSkillMd(skillMdFile.content)
    : null;

  const committedDate = headCommit.committedDate ? Date.parse(headCommit.committedDate) : null;
  const latestCommitMessage = truncateUploadCommitMessage(headCommit.message);
  const nextVersion = deriveNextSnapshotVersion(skill.latestVersion);
  const snapshotId = await step.do(
    "create-skill-snapshot",
    workflowStepRetryPolicy.repoSkillSnapshotSync,
    async () =>
      await activeDeps.createSnapshot({
        description: skill.latestDescription,
        directoryPath: normalizeUploadDirectoryPath(skill.directoryPath),
        entryPath: skill.entryPath,
        frontmatterHash: fingerprint?.frontmatterHash ?? null,
        hash: nextHash,
        name: skill.latestName,
        skillContentHash: fingerprint?.skillContentHash ?? null,
        skillId,
        sourceCommitDate: committedDate ?? undefined,
        sourceCommitMessage: latestCommitMessage,
        sourceCommitSha: headSha,
        sourceCommitUrl: headCommit.url ?? null,
        syncTime: committedDate ?? Date.now(),
        version: nextVersion,
      }),
  );

  const upload = await step.do(
    "upload-skill-snapshot-files",
    workflowStepRetryPolicy.repoSkillSnapshotSync,
    async () =>
      await activeDeps.uploadSnapshotFiles({
        files: filesResponse.files,
        snapshotId,
      }),
  );

  await step.do(
    "set-skill-latest-snapshot",
    workflowStepRetryPolicy.repoSkillSnapshotSync,
    async () =>
      await activeDeps.setSkillLatestSnapshot({
        latestCommitDate: committedDate,
        latestCommitMessage,
        latestCommitSha: headSha,
        latestCommitUrl: headCommit.url ?? null,
        skillId,
        snapshotId,
        version: nextVersion,
      }),
  );

  await step.do(
    "deprecate-skill-snapshots",
    workflowStepRetryPolicy.repoSkillSnapshotSync,
    async () =>
      await activeDeps.deprecateSnapshotsBeyondLimit({
        keepLatest: 3,
        skillId,
      }),
  );

  return {
    snapshotId,
    status: "completed" as const,
    uploadWorkId: upload.workId,
  };
};
