import type {
  AiSearchItemsRuntime,
  SnapshotHistoryRuntime,
  SnapshotUploadScheduler,
  SkillsTaggingScheduler,
} from "@skills-re/api/types";
import { normalizeSkillSlug } from "@skills-re/contract/common/slugs";
import {
  createSnapshot,
  deprecateSnapshotsBeyondLimit,
  findSnapshotByContentHashes,
  setSkillLatestSnapshot,
} from "@skills-re/api/modules/snapshots/repo";
import { ensureRepo } from "@skills-re/api/modules/repos/service";
import { createStaticAuditWorkflowTarget } from "@skills-re/api/modules/static-audits/workflow-target";
import type { StaticAuditWorkflowTarget } from "@skills-re/api/modules/static-audits/workflow-target";
import {
  createSkill,
  checkSkillExistingBySlug,
  listRepoSkillSnapshotHeadsByRepoId,
  updateSkillAiSearchItemId,
} from "@skills-re/api/modules/skills/repo";
import { replaceSkillSearchDocument } from "@skills-re/api/modules/skills/search-document-service";
import { normalizeSkillTags } from "@skills-re/api/modules/tags/ai-tagging";
import { syncSkillTags } from "@skills-re/api/modules/tags/service";
import { uploadSnapshotFiles } from "@skills-re/api/modules/snapshots/service";

import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import type { AiSearchUploadRateLimitReservation } from "@/dos/ai-search-upload-rate-limiter";
import type { StaticAuditDispatchRateLimitReservation } from "@/dos/static-audit-dispatch-rate-limiter";
import { asRepoId, asSkillId, asSnapshotId } from "@skills-re/db/utils";

import { cleanupStagedSkillsUploadPayload, loadStagedSkillsUploadPayload } from "./skills-upload";
import type {
  SkillsStagingBucket,
  SkillsUploadContentPayload,
  SkillsUploadWorkflowPayload,
} from "./skills-upload";
import {
  normalizeUploadDirectoryPath,
  normalizeUploadEntryPath,
  prepareUploadSkills,
  resolveUploadSkillSlug,
  truncateUploadCommitMessage,
} from "@skills-re/api/modules/skills/upload-pipeline";

import {
  buildSkillDuplicateFingerprintFromSkillMd,
  SKILL_FILENAME,
  normalizeSkillRootPath,
} from "../github-skill-utils";

const QUIET_STATIC_AUDIT_SKIP_REASONS = new Set([
  "missing-config",
  "missing-dispatch-runtime",
  "no-targets",
]);

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
  sleep?(name: string, duration: string | number): Promise<void>;
}

export interface RunSkillsUploadWorkflowDeps {
  aiSearchItems?: AiSearchItemsRuntime | null;
  checkSkillExistingBySlug?: typeof checkSkillExistingBySlug;
  createSkill?: typeof createSkill;
  createSnapshot?: typeof createSnapshot;
  findSnapshotByContentHashes?: typeof findSnapshotByContentHashes;
  deprecateSnapshotsBeyondLimit?: typeof deprecateSnapshotsBeyondLimit;
  ensureRepo?: typeof ensureRepo;
  listRepoSkillSnapshotHeadsByRepoId?: typeof listRepoSkillSnapshotHeadsByRepoId;
  reserveAiSearchUploadSlot?: () => Promise<AiSearchUploadRateLimitReservation>;
  reserveStaticAuditDispatchSlot?: () => Promise<StaticAuditDispatchRateLimitReservation>;
  replaceSkillSearchDocument?: typeof replaceSkillSearchDocument;
  scheduleSkillsTagging?: SkillsTaggingScheduler | null;
  snapshotFilesBucket?: SkillsStagingBucket | null;
  snapshotHistory?: SnapshotHistoryRuntime | null;
  setSkillLatestSnapshot?: typeof setSkillLatestSnapshot;
  snapshotUploadScheduler?: SnapshotUploadScheduler | null;
  syncSkillTags?: typeof syncSkillTags;
  runUploadSnapshotFilesPipeline?: (input: {
    files: { content: string; path: string }[];
    snapshotId: string;
  }) => Promise<{ filesCount: number; snapshotId: string; workId?: string }>;
  dispatchStaticAuditWorkflow?: (targets: StaticAuditWorkflowTarget[]) => Promise<
    | {
        dispatched: false;
        reason: string;
      }
    | {
        dispatched: true;
        repository: string;
        workflowFile: string;
      }
  >;
  updateSkillAiSearchItemId?: typeof updateSkillAiSearchItemId;
  uploadSnapshotFiles?: typeof uploadSnapshotFiles;
}

const normalizeAiSearchFilePath = (value: string) =>
  value
    .replaceAll("\\", "/")
    .trim()
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");

const normalizeUploadFilePath = (value: string) =>
  value
    .replaceAll("\\", "/")
    .trim()
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");

const formatErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const skillPathsMatch = (filePath: string, entryPath: string, rootPath: string) => {
  if (filePath === entryPath) {
    return true;
  }
  // file path is an absolute path longer than entryPath (e.g. "/prefix/SKILL.md" vs "SKILL.md")
  if (filePath.endsWith(`/${entryPath}`)) {
    return true;
  }
  // file path is a relative path shorter than entryPath — fetchSkillFilesForRoot strips the root
  // prefix, so filePath="SKILL.md" while entryPath="skills/my-skill/SKILL.md"
  if (entryPath.endsWith(`/${filePath}`)) {
    return true;
  }
  if (rootPath.length > 0 && entryPath === `${rootPath}/${filePath}`) {
    return true;
  }
  return false;
};

const findSkillMdContent = (
  skill: Awaited<ReturnType<typeof prepareUploadSkills>>[number],
): string | null => {
  const normalizedEntryPath = normalizeUploadFilePath(skill.entryPath);
  const normalizedRootPath = normalizeSkillRootPath(skill.directoryPath);

  const candidate = skill.initialSnapshot.files.find((file) =>
    skillPathsMatch(normalizeUploadFilePath(file.path), normalizedEntryPath, normalizedRootPath),
  );

  return candidate?.content ?? null;
};

const buildEnsureRepoInput = (repo: NonNullable<SkillsUploadContentPayload["repo"]>) => ({
  createdAt: repo.createdAt,
  defaultBranch: repo.defaultBranch,
  forks: repo.forks,
  license: repo.license,
  nameWithOwner: repo.nameWithOwner,
  owner: {
    avatarUrl: repo.owner.avatarUrl ?? null,
    bio: repo.owner.bio ?? null,
    handle: repo.owner.handle,
    name: repo.owner.name ?? null,
  },
  stars: repo.stars,
  updatedAt: repo.updatedAt,
});

const findSkillMdFile = (skill: Awaited<ReturnType<typeof prepareUploadSkills>>[number]) =>
  skill.entryPath
    ? skill.initialSnapshot.files.find((file) => {
        const normalizedFilePath = normalizeAiSearchFilePath(file.path);
        const normalizedEntryPath = normalizeAiSearchFilePath(skill.entryPath);
        return skillPathsMatch(normalizedFilePath, normalizedEntryPath, "");
      })
    : skill.initialSnapshot.files.find((file) => file.path.split("/").at(-1) === SKILL_FILENAME);

const normalizeCanonicalSlug = (value: string) => normalizeSkillSlug(value);

const buildUniqueSkillIdByCanonicalSlug = (
  existingRepoSkills: Awaited<ReturnType<typeof listRepoSkillSnapshotHeadsByRepoId>>,
) => {
  const skillIdsBySlug = new Map<string, string[]>();
  for (const existingSkill of existingRepoSkills) {
    const canonicalSlug = normalizeCanonicalSlug(existingSkill.canonicalSlug ?? existingSkill.slug);
    const skillIds = skillIdsBySlug.get(canonicalSlug) ?? [];
    skillIds.push(existingSkill.skillId);
    skillIdsBySlug.set(canonicalSlug, skillIds);
  }

  const uniqueSkillIds = new Map<string, string>();
  for (const [canonicalSlug, skillIds] of skillIdsBySlug) {
    const [skillId] = skillIds;
    if (skillIds.length === 1 && skillId) {
      uniqueSkillIds.set(canonicalSlug, skillId);
    }
  }

  return uniqueSkillIds;
};

interface ProcessUploadSkillParams {
  authorHandle: string;
  deps: RunSkillsUploadWorkflowDeps;
  existingRepoSkillIdByCanonicalSlug: Map<string, string>;
  existingRepoSkillIdByDirectoryPath: Map<string, string>;
  repoId: string;
  repoName: string;
  skill: Awaited<ReturnType<typeof prepareUploadSkills>>[number];
  skillIndex: number;
  step: WorkflowStep;
  syncTime: number;
  usedSlugs: Set<string>;
}

const waitForAiSearchUploadSlot = async ({
  deps,
  skillIndex,
  step,
}: Pick<ProcessUploadSkillParams, "deps" | "skillIndex" | "step">) => {
  if (!deps.reserveAiSearchUploadSlot) {
    return;
  }

  const reservation = await step.do(
    `reserve-upload-skill-ai-search-${skillIndex}`,
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () => await deps.reserveAiSearchUploadSlot?.(),
  );
  if (reservation && reservation.delaySeconds > 0) {
    await step.sleep?.(
      `wait-upload-skill-ai-search-${skillIndex}`,
      `${reservation.delaySeconds} seconds`,
    );
  }
};

const waitForStaticAuditDispatchSlot = async ({
  auditTargets,
  deps,
  step,
}: {
  auditTargets: StaticAuditWorkflowTarget[];
  deps: RunSkillsUploadWorkflowDeps;
  step: WorkflowStep;
}) => {
  if (!deps.reserveStaticAuditDispatchSlot || auditTargets.length === 0) {
    return;
  }

  const reservation = await step.do(
    "reserve-static-audit-dispatch",
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () => await deps.reserveStaticAuditDispatchSlot?.(),
  );
  if (reservation && reservation.delaySeconds > 0) {
    await step.sleep?.("wait-static-audit-dispatch", `${reservation.delaySeconds} seconds`);
  }
};

const resolveUploadSkillRecord = async ({
  deps,
  existingRepoSkillIdByCanonicalSlug,
  existingRepoSkillIdByDirectoryPath,
  repoId,
  skill,
  skillIndex,
  step,
  syncTime,
  usedSlugs,
}: Omit<ProcessUploadSkillParams, "authorHandle" | "repoName">) => {
  const normalizedDirectoryPath = normalizeUploadDirectoryPath(skill.directoryPath);
  const canonicalSlug = normalizeCanonicalSlug(skill.slug);
  const existingSkillId =
    existingRepoSkillIdByDirectoryPath.get(normalizedDirectoryPath) ??
    existingRepoSkillIdByCanonicalSlug.get(canonicalSlug) ??
    null;

  if (existingSkillId) {
    usedSlugs.add(skill.slug);
    return {
      canonicalSlug,
      normalizedDirectoryPath,
      skillId: existingSkillId,
      slug: skill.slug,
    };
  }

  const slug = await step.do(
    `resolve-upload-skill-slug-${skillIndex}`,
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () =>
      await resolveUploadSkillSlug({
        checkSkillExistingBySlug: deps.checkSkillExistingBySlug ?? checkSkillExistingBySlug,
        preferredSlug: skill.slug,
        usedSlugs,
      }),
  );

  const skillId = await step.do(
    `create-upload-skill-${skillIndex}`,
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () =>
      await (deps.createSkill ?? createSkill)({
        canonicalSlug,
        description: skill.description,
        repoId,
        slug,
        syncTime,
        title: skill.title,
        userId: null,
        visibility: "public",
      }),
  );

  existingRepoSkillIdByDirectoryPath.set(normalizedDirectoryPath, skillId);

  return {
    canonicalSlug,
    normalizedDirectoryPath,
    skillId,
    slug,
  };
};

const processUploadSkill = async ({
  authorHandle,
  deps,
  existingRepoSkillIdByCanonicalSlug,
  existingRepoSkillIdByDirectoryPath,
  repoId,
  repoName,
  skill,
  skillIndex,
  step,
  syncTime,
  usedSlugs,
}: ProcessUploadSkillParams) => {
  const skillMdContent = findSkillMdContent(skill);
  const computedFingerprint = skillMdContent
    ? await buildSkillDuplicateFingerprintFromSkillMd(skillMdContent)
    : null;

  const effectiveFrontmatterHash =
    skill.frontmatterHash ?? computedFingerprint?.frontmatterHash ?? null;
  const effectiveSkillContentHash =
    skill.skillContentHash ?? computedFingerprint?.skillContentHash ?? null;

  if (effectiveFrontmatterHash && effectiveSkillContentHash) {
    const duplicate = await step.do(
      `check-duplicate-content-${skillIndex}`,
      workflowStepRetryPolicy.skillsUploadPipeline,
      async () =>
        await (deps.findSnapshotByContentHashes ?? findSnapshotByContentHashes)({
          frontmatterHash: effectiveFrontmatterHash,
          skillContentHash: effectiveSkillContentHash,
        }),
    );
    if (duplicate) {
      return { reason: "duplicate-content" as const, status: "skipped" as const };
    }
  }

  const { normalizedDirectoryPath, skillId, slug } = await resolveUploadSkillRecord({
    deps,
    existingRepoSkillIdByCanonicalSlug,
    existingRepoSkillIdByDirectoryPath,
    repoId,
    skill,
    skillIndex,
    step,
    syncTime,
    usedSlugs,
  });

  const snapshotVersion = skill.preferredVersion ?? "1.0.0";
  const skillTags = normalizeSkillTags(skill.tags ?? []);
  const snapshotId = await step.do(
    `create-upload-snapshot-${skillIndex}`,
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () =>
      await (deps.createSnapshot ?? createSnapshot)({
        description: skill.description,
        directoryPath: normalizedDirectoryPath,
        entryPath: normalizeUploadEntryPath(skill.entryPath),
        frontmatterHash: effectiveFrontmatterHash,
        hash: skill.snapshotHash,
        name: skill.title,
        skillContentHash: effectiveSkillContentHash,
        skillId,
        sourceCommitDate: skill.initialSnapshot.sourceCommitDate,
        sourceCommitMessage: truncateUploadCommitMessage(skill.initialSnapshot.sourceCommitMessage),
        sourceCommitSha: skill.initialSnapshot.sourceCommitSha,
        sourceCommitUrl: skill.initialSnapshot.sourceCommitUrl ?? null,
        syncTime,
        version: snapshotVersion,
      }),
  );

  const auditTarget = createStaticAuditWorkflowTarget({
    owner: authorHandle,
    repo: repoName,
    skillRootPath: skill.directoryPath,
    snapshotId,
    sourceCommitSha: skill.initialSnapshot.sourceCommitSha,
    sourceRef: skill.initialSnapshot.sourceRef,
  });

  const upload = await step.do(
    `upload-skill-snapshot-files-${skillIndex}`,
    workflowStepRetryPolicy.skillsUploadFiles,
    async () => {
      const input = {
        files: skill.initialSnapshot.files,
        snapshotId,
      };
      if (deps.runUploadSnapshotFilesPipeline) {
        return await deps.runUploadSnapshotFilesPipeline(input);
      }

      return await (deps.uploadSnapshotFiles ?? uploadSnapshotFiles)(
        input,
        deps.snapshotUploadScheduler ?? null,
      );
    },
  );

  await step.do(
    `set-upload-skill-latest-snapshot-${skillIndex}`,
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () =>
      await (deps.setSkillLatestSnapshot ?? setSkillLatestSnapshot)({
        latestCommitDate: skill.initialSnapshot.sourceCommitDate,
        latestCommitMessage: truncateUploadCommitMessage(skill.initialSnapshot.sourceCommitMessage),
        latestCommitSha: skill.initialSnapshot.sourceCommitSha,
        latestCommitUrl: skill.initialSnapshot.sourceCommitUrl ?? null,
        skillId,
        snapshotId,
        syncTime,
        version: snapshotVersion,
      }),
  );

  await step.do(
    `sync-upload-skill-tags-${skillIndex}`,
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () =>
      await (deps.syncSkillTags ?? syncSkillTags)({
        skillId,
        tags: skillTags,
      }),
  );

  const skillMdFile = findSkillMdFile(skill);
  await step.do(
    `replace-upload-skill-search-document-${skillIndex}`,
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () => {
      if (!skillMdFile) {
        console.warn("[skills-upload] fts-search skipped: entry file not found", {
          entryPath: skill.entryPath,
          filePaths: skill.initialSnapshot.files.map((file) => file.path),
          skillId,
          skillIndex,
        });
        return null;
      }

      try {
        return await (deps.replaceSkillSearchDocument ?? replaceSkillSearchDocument)({
          authorHandle,
          body: skillMdFile.content,
          contentHash: effectiveSkillContentHash ?? skill.snapshotHash,
          description: skill.description,
          isPublic: true,
          repository: repoName,
          skillId: asSkillId(skillId),
          slug,
          snapshotId: asSnapshotId(snapshotId),
          tags: skillTags,
          title: skill.title,
          updatedAt: syncTime,
        });
      } catch (error) {
        console.warn("[skills-upload] fts-search document update failed", {
          error: formatErrorMessage(error),
          skillId,
          skillIndex,
        });
        return null;
      }
    },
  );

  await step.do(
    `deprecate-upload-skill-snapshots-${skillIndex}`,
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () =>
      await (deps.deprecateSnapshotsBeyondLimit ?? deprecateSnapshotsBeyondLimit)({
        keepLatest: 3,
        skillId,
      }),
  );

  if (deps.aiSearchItems && skillMdFile && deps.reserveAiSearchUploadSlot) {
    await waitForAiSearchUploadSlot({ deps, skillIndex, step });
  }

  const aiSearchItemId = await step.do(
    `upload-skill-ai-search-${skillIndex}`,
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () => {
      if (!deps.aiSearchItems) {
        return null;
      }
      if (!skillMdFile) {
        console.warn("[skills-upload] ai-search skipped: entry file not found", {
          skillId,
          skillIndex,
          entryPath: skill.entryPath,
          filePaths: skill.initialSnapshot.files.map((f) => f.path),
        });
        return null;
      }

      try {
        const { id } = await deps.aiSearchItems.uploadItem(`${skillId}.md`, skillMdFile.content, {
          authorHandle,
          repoName,
          skillId,
          skillSlug: slug,
          version: skill.preferredVersion ?? "1.0.0",
        });
        return id;
      } catch (error) {
        console.warn("[skills-upload] ai-search upload failed", {
          skillId,
          skillIndex,
          error: formatErrorMessage(error),
        });
        return null;
      }
    },
  );

  if (aiSearchItemId) {
    await step.do(
      `link-skill-ai-search-${skillIndex}`,
      workflowStepRetryPolicy.skillsUploadPipeline,
      async () => {
        try {
          await (deps.updateSkillAiSearchItemId ?? updateSkillAiSearchItemId)({
            aiSearchItemId,
            skillId,
          });
        } catch {
          // Non-fatal: AI-search item linking is advisory and must not fail the upload.
        }
      },
    );
  }

  await step.do(
    `schedule-upload-skill-tagging-${skillIndex}`,
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () => {
      if (!deps.scheduleSkillsTagging) {
        return;
      }

      await deps.scheduleSkillsTagging.enqueue({
        skillIds: [skillId],
        triggerCategorizationAfterTagging: true,
      });
    },
  );

  return {
    auditTarget,
    skillId,
    uploadWorkId: upload.workId ?? `snapshot-upload-${snapshotId}`,
  };
};

const dispatchUploadStaticAudit = async ({
  auditTargets,
  createdSkillIds,
  deps,
  step,
}: {
  auditTargets: StaticAuditWorkflowTarget[];
  createdSkillIds: string[];
  deps: RunSkillsUploadWorkflowDeps;
  step: WorkflowStep;
}) => {
  const dispatchStaticAuditWorkflow =
    deps.dispatchStaticAuditWorkflow ??
    (() => ({
      dispatched: false as const,
      reason: "missing-dispatch-runtime",
    }));

  try {
    await waitForStaticAuditDispatchSlot({ auditTargets, deps, step });
    const auditDispatch = await dispatchStaticAuditWorkflow(auditTargets);
    if (auditDispatch.dispatched) {
      return;
    }

    if (!QUIET_STATIC_AUDIT_SKIP_REASONS.has(auditDispatch.reason)) {
      console.warn("[skills-upload] static audit workflow not dispatched", {
        createdSkillsCount: createdSkillIds.length,
        reason: auditDispatch.reason,
        step: "dispatch-static-audit",
        targetCount: auditTargets.length,
      });
    }
  } catch (error) {
    console.warn("[skills-upload] failed to dispatch static audit workflow", {
      createdSkillsCount: createdSkillIds.length,
      message: formatErrorMessage(error),
      step: "dispatch-static-audit",
    });
  }
};

const createHistoricalSnapshotsIfNeeded = async ({
  authorHandle,
  createdSkillIds,
  deps,
  recentCommits,
  repoName,
  step,
}: {
  authorHandle: string;
  createdSkillIds: string[];
  deps: RunSkillsUploadWorkflowDeps;
  recentCommits: SkillsUploadContentPayload["recentCommits"] | null;
  repoName: string;
  step: WorkflowStep;
}) => {
  const snapshotHistory = deps.snapshotHistory ?? null;

  if (
    !snapshotHistory ||
    !recentCommits ||
    recentCommits.length <= 1 ||
    createdSkillIds.length === 0 ||
    !authorHandle ||
    !repoName
  ) {
    return;
  }

  await step.do(
    "create-upload-historical-snapshots",
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () =>
      await snapshotHistory.createHistoricalSnapshots({
        commits: recentCommits,
        repoName,
        repoOwner: authorHandle,
        skillIds: createdSkillIds,
      }),
  );
};

export const runSkillsUploadWorkflow = async (
  event: Readonly<WorkflowEvent<SkillsUploadWorkflowPayload>>,
  step: WorkflowStep,
  deps: RunSkillsUploadWorkflowDeps = {},
) => {
  try {
    // Load the staged payload outside step.do so we never persist the full repo payload
    // as a workflow step result. That payload can exceed the workflow serialization limit.
    const payload = await loadStagedSkillsUploadPayload(deps.snapshotFilesBucket, event.payload);

    const { repo } = payload;
    if (!repo) {
      throw new Error("Repo metadata is required for skill upload.");
    }

    const preparedSkills = await prepareUploadSkills(payload.skills);

    const repoId = await step.do(
      "ensure-upload-repo",
      workflowStepRetryPolicy.skillsUploadPipeline,
      async () => await (deps.ensureRepo ?? ensureRepo)(buildEnsureRepoInput(repo)),
    );
    const existingRepoSkills = await step.do(
      "list-existing-upload-repo-skills",
      workflowStepRetryPolicy.skillsUploadPipeline,
      async () =>
        await (deps.listRepoSkillSnapshotHeadsByRepoId ?? listRepoSkillSnapshotHeadsByRepoId)(
          asRepoId(repoId),
        ),
    );

    const [authorHandle = "", repoName = ""] = repo.nameWithOwner.split("/");
    const createdSkillIds: string[] = [];
    const auditTargets: StaticAuditWorkflowTarget[] = [];
    let firstWorkId: string | null = null;
    const usedSlugs = new Set<string>();
    const existingRepoSkillIdByDirectoryPath = new Map(
      existingRepoSkills.map((existingSkill) => [
        normalizeUploadDirectoryPath(existingSkill.directoryPath),
        existingSkill.skillId,
      ]),
    );
    const existingRepoSkillIdByCanonicalSlug =
      buildUniqueSkillIdByCanonicalSlug(existingRepoSkills);
    const syncTime = Date.now();

    for (const [index, skill] of preparedSkills.entries()) {
      const result = await processUploadSkill({
        authorHandle,
        deps,
        existingRepoSkillIdByCanonicalSlug,
        existingRepoSkillIdByDirectoryPath,
        repoId,
        repoName,
        skill,
        skillIndex: index,
        step,
        syncTime,
        usedSlugs,
      });

      if (result.status === "skipped") {
        continue;
      }

      auditTargets.push(result.auditTarget);
      createdSkillIds.push(result.skillId);

      if (!firstWorkId) {
        firstWorkId = result.uploadWorkId;
      }
    }

    await dispatchUploadStaticAudit({ auditTargets, createdSkillIds, deps, step });

    await createHistoricalSnapshotsIfNeeded({
      authorHandle,
      createdSkillIds,
      deps,
      recentCommits: payload.recentCommits ?? null,
      repoName,
      step,
    });

    return {
      ids: createdSkillIds,
      workId: firstWorkId ?? `upload-${crypto.randomUUID()}`,
    };
  } finally {
    try {
      await step.do("cleanup-staging", workflowStepRetryPolicy.skillsUploadPipeline, async () => {
        await cleanupStagedSkillsUploadPayload(deps.snapshotFilesBucket, event.payload);
      });
    } catch (error) {
      console.warn("[skills-upload] failed to cleanup staged payload", { error });
    }
  }
};
