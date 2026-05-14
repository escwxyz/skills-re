import type {
  AiSearchItemsRuntime,
  SnapshotHistoryRuntime,
  SnapshotUploadScheduler,
  SkillsTaggingScheduler,
} from "@skills-re/api/types";
import {
  createSnapshot,
  deprecateSnapshotsBeyondLimit,
  setSkillLatestSnapshot,
} from "@skills-re/api/modules/snapshots/repo";
import { ensureRepo } from "@skills-re/api/modules/repos/service";
import { createStaticAuditWorkflowTarget } from "@skills-re/api/modules/static-audits/workflow-target";
import type { StaticAuditWorkflowTarget } from "@skills-re/api/modules/static-audits/workflow-target";
import {
  createSkill,
  checkSkillExistingBySlug,
  updateSkillAiSearchItemId,
} from "@skills-re/api/modules/skills/repo";
import { normalizeSkillTags } from "@skills-re/api/modules/tags/ai-tagging";
import { syncSkillTags } from "@skills-re/api/modules/tags/service";
import { uploadSnapshotFiles } from "@skills-re/api/modules/snapshots/service";

import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";

import { cleanupStagedSkillsUploadPayload, loadStagedSkillsUploadPayload } from "./skills-upload";
import type { SkillsStagingBucket, SkillsUploadWorkflowPayload } from "./skills-upload";
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

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface RunSkillsUploadWorkflowDeps {
  aiSearchItems?: AiSearchItemsRuntime | null;
  checkSkillExistingBySlug?: typeof checkSkillExistingBySlug;
  createSkill?: typeof createSkill;
  createSnapshot?: typeof createSnapshot;
  deprecateSnapshotsBeyondLimit?: typeof deprecateSnapshotsBeyondLimit;
  ensureRepo?: typeof ensureRepo;
  scheduleSkillsTagging?: SkillsTaggingScheduler | null;
  snapshotFilesBucket?: SkillsStagingBucket | null;
  snapshotHistory?: SnapshotHistoryRuntime | null;
  setSkillLatestSnapshot?: typeof setSkillLatestSnapshot;
  snapshotUploadScheduler?: SnapshotUploadScheduler | null;
  syncSkillTags?: typeof syncSkillTags;
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

const findSkillMdContent = (
  skill: Awaited<ReturnType<typeof prepareUploadSkills>>[number],
): string | null => {
  const normalizedEntryPath = normalizeUploadFilePath(skill.entryPath);

  const directMatch = skill.initialSnapshot.files.find(
    (file) => normalizeUploadFilePath(file.path) === normalizedEntryPath,
  );
  if (directMatch) {
    return directMatch.content;
  }

  const normalizedRootPath = normalizeSkillRootPath(skill.directoryPath);
  const candidate = skill.initialSnapshot.files.find((file) => {
    const normalizedPath = normalizeUploadFilePath(file.path);
    if (normalizedPath === normalizedEntryPath) {
      return true;
    }
    return normalizedRootPath.length > 0
      ? normalizedPath.endsWith(`/${normalizedEntryPath}`) ||
          normalizedPath === `${normalizedRootPath}/${normalizedEntryPath}`
      : normalizedPath === normalizedEntryPath;
  });

  return candidate?.content ?? null;
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
      async () =>
        await (deps.ensureRepo ?? ensureRepo)({
          createdAt: repo.createdAt,
          defaultBranch: repo.defaultBranch,
          forks: repo.forks,
          license: repo.license,
          nameWithOwner: repo.nameWithOwner,
          owner: {
            avatarUrl: repo.owner.avatarUrl ?? null,
            handle: repo.owner.handle,
            name: repo.owner.name ?? null,
          },
          stars: repo.stars,
          updatedAt: repo.updatedAt,
        }),
    );

    const [authorHandle = "", repoName = ""] = repo.nameWithOwner.split("/");
    const createdSkillIds: string[] = [];
    const auditTargets: StaticAuditWorkflowTarget[] = [];
    let firstWorkId: string | null = null;
    const usedSlugs = new Set<string>();
    const syncTime = Date.now();

    for (const [index, skill] of preparedSkills.entries()) {
      const skillMdContent = findSkillMdContent(skill);
      const computedFingerprint = skillMdContent
        ? await buildSkillDuplicateFingerprintFromSkillMd(skillMdContent)
        : null;

      const slug = await step.do(
        `resolve-upload-skill-slug-${index}`,
        workflowStepRetryPolicy.skillsUploadPipeline,
        async () =>
          await resolveUploadSkillSlug({
            checkSkillExistingBySlug: deps.checkSkillExistingBySlug ?? checkSkillExistingBySlug,
            preferredSlug: skill.slug,
            usedSlugs,
          }),
      );

      const skillId = await step.do(
        `create-upload-skill-${index}`,
        workflowStepRetryPolicy.skillsUploadPipeline,
        async () =>
          await (deps.createSkill ?? createSkill)({
            description: skill.description,
            repoId,
            slug,
            syncTime,
            title: skill.title,
            userId: null,
            visibility: "public",
          }),
      );

      createdSkillIds.push(skillId);

      const snapshotId = await step.do(
        `create-upload-snapshot-${index}`,
        workflowStepRetryPolicy.skillsUploadPipeline,
        async () =>
          await (deps.createSnapshot ?? createSnapshot)({
            description: skill.description,
            directoryPath: normalizeUploadDirectoryPath(skill.directoryPath),
            entryPath: normalizeUploadEntryPath(skill.entryPath),
            frontmatterHash: skill.frontmatterHash ?? computedFingerprint?.frontmatterHash ?? null,
            hash: skill.snapshotHash,
            name: skill.title,
            skillContentHash:
              skill.skillContentHash ?? computedFingerprint?.skillContentHash ?? null,
            skillId,
            sourceCommitDate: skill.initialSnapshot.sourceCommitDate,
            sourceCommitMessage: truncateUploadCommitMessage(
              skill.initialSnapshot.sourceCommitMessage,
            ),
            sourceCommitSha: skill.initialSnapshot.sourceCommitSha,
            sourceCommitUrl: skill.initialSnapshot.sourceCommitUrl ?? null,
            syncTime,
            version: skill.preferredVersion ?? "0.0.1",
          }),
      );

      auditTargets.push(
        createStaticAuditWorkflowTarget({
          owner: authorHandle,
          repo: repoName,
          skillRootPath: skill.directoryPath,
          snapshotId,
          sourceCommitSha: skill.initialSnapshot.sourceCommitSha,
          sourceRef: skill.initialSnapshot.sourceRef,
        }),
      );

      const upload = await step.do(
        `upload-skill-snapshot-files-${index}`,
        workflowStepRetryPolicy.skillsUploadPipeline,
        async () =>
          await (deps.uploadSnapshotFiles ?? uploadSnapshotFiles)(
            {
              files: skill.initialSnapshot.files,
              snapshotId,
            },
            deps.snapshotUploadScheduler ?? null,
          ),
      );

      if (!firstWorkId) {
        firstWorkId = upload.workId;
      }

      await step.do(
        `set-upload-skill-latest-snapshot-${index}`,
        workflowStepRetryPolicy.skillsUploadPipeline,
        async () =>
          await (deps.setSkillLatestSnapshot ?? setSkillLatestSnapshot)({
            latestCommitDate: skill.initialSnapshot.sourceCommitDate,
            latestCommitMessage: truncateUploadCommitMessage(
              skill.initialSnapshot.sourceCommitMessage,
            ),
            latestCommitSha: skill.initialSnapshot.sourceCommitSha,
            latestCommitUrl: skill.initialSnapshot.sourceCommitUrl ?? null,
            skillId,
            snapshotId,
            syncTime,
          }),
      );

      await step.do(
        `sync-upload-skill-tags-${index}`,
        workflowStepRetryPolicy.skillsUploadPipeline,
        async () =>
          await (deps.syncSkillTags ?? syncSkillTags)({
            skillId,
            tags: normalizeSkillTags(skill.tags ?? []),
          }),
      );

      await step.do(
        `deprecate-upload-skill-snapshots-${index}`,
        workflowStepRetryPolicy.skillsUploadPipeline,
        async () =>
          await (deps.deprecateSnapshotsBeyondLimit ?? deprecateSnapshotsBeyondLimit)({
            keepLatest: 3,
            skillId,
          }),
      );

      const skillMdFile = skill.entryPath
        ? skill.initialSnapshot.files.find((file) => {
            const normalizedFilePath = normalizeAiSearchFilePath(file.path);
            const normalizedEntryPath = normalizeAiSearchFilePath(skill.entryPath);
            return (
              normalizedFilePath === normalizedEntryPath ||
              normalizedFilePath.endsWith(`/${normalizedEntryPath}`)
            );
          })
        : skill.initialSnapshot.files.find(
            (file) => file.path.split("/").at(-1) === SKILL_FILENAME,
          );

      const aiSearchItemId = await step.do(
        `upload-skill-ai-search-${index}`,
        workflowStepRetryPolicy.skillsUploadPipeline,
        async () => {
          if (!deps.aiSearchItems || !skillMdFile) {
            return null;
          }

          try {
            const { id } = await deps.aiSearchItems.uploadItem(
              `${skillId}.md`,
              skillMdFile.content,
              {
                authorHandle,
                repoName,
                skillId,
                skillSlug: slug,
                version: skill.preferredVersion ?? "0.0.1",
              },
            );
            return id;
          } catch {
            return null;
          }
        },
      );

      if (aiSearchItemId) {
        await step.do(
          `link-skill-ai-search-${index}`,
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
        `schedule-upload-skill-tagging-${index}`,
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
    }

    await step.do(
      "dispatch-static-audit",
      workflowStepRetryPolicy.skillsUploadPipeline,
      async () => {
        const dispatchStaticAuditWorkflow =
          deps.dispatchStaticAuditWorkflow ??
          (() => ({
            dispatched: false as const,
            reason: "missing-dispatch-runtime",
          }));

        console.info("[skills-upload] preparing static audit dispatch", {
          createdSkillsCount: createdSkillIds.length,
          auditTargetsCount: auditTargets.length,
          auditTargets: auditTargets.map((target) => ({
            owner: target.owner,
            repo: target.repo,
            skillRootPath: target.skillRootPath ?? null,
            snapshotId: target.snapshotId ?? null,
            sourceCommitSha: target.sourceCommitSha ?? null,
            sourceRef: target.sourceRef ?? null,
          })),
        });

        try {
          const auditDispatch = await dispatchStaticAuditWorkflow(auditTargets);
          if (auditDispatch.dispatched) {
            console.info("[skills-upload] static audit workflow dispatched", {
              createdSkillsCount: createdSkillIds.length,
              repository: auditDispatch.repository,
              step: "dispatch-static-audit",
              workflowFile: auditDispatch.workflowFile,
            });
          } else {
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
      },
    );

    const snapshotHistory = deps.snapshotHistory ?? null;
    const recentCommits = payload.recentCommits ?? null;

    if (
      snapshotHistory &&
      recentCommits &&
      recentCommits.length > 1 &&
      createdSkillIds.length > 0 &&
      authorHandle &&
      repoName
    ) {
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
    }

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
