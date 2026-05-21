import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { asSkillId } from "@skills-re/db/utils";
import { createAiSearchItemsRuntime } from "../ai-search";
import { createSnapshotArchiveStorageRuntime } from "../lib/cloudflare/r2";
import { reserveAiSearchUploadSlot } from "../lib/workflows/ai-search-upload-rate-limit";
import { createGithubSnapshotHistoryHelpers } from "../github-history";
import { createStaticAuditGithubRuntime } from "../static-audits-github";
import { createSnapshotsHistoryRuntime } from "../snapshots-history";
import { getSnapshotUploadWorkflowScheduler } from "./snapshot-upload";
import { getSnapshotsArchiveUploadWorkflowScheduler } from "./snapshots-archive-upload";
import { getSkillsTaggingWorkflowScheduler } from "./skills-tagging-scheduler";
import { runSkillsUploadWorkflow } from "./skills-upload-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { SkillsUploadWorkflowPayload } from "./skills-upload";
import {
  createHistoricalSnapshotRunner,
  createSnapshotsService,
} from "@skills-re/api/modules/snapshots/service";
import type { HistoricalSnapshotRunnerDeps } from "@skills-re/api/modules/snapshots/service";
import {
  getSnapshotBySkillAndCommit,
  listSkillsHistoryInfoByIds,
} from "@skills-re/api/modules/skills/repo";

type HistoricalGetSnapshotBySkillAndCommitInput = Parameters<
  HistoricalSnapshotRunnerDeps["getSnapshotBySkillAndCommit"]
>[0];

type HistoricalUploadSnapshotFilesInput = Parameters<
  HistoricalSnapshotRunnerDeps["uploadSnapshotFiles"]
>[0];

export class SkillsUploadWorkflow extends WorkflowEntrypoint<Env, unknown> {
  run(event: Readonly<WorkflowEvent<SkillsUploadWorkflowPayload>>, step: WorkflowStep) {
    const aiSearchItems = createAiSearchItemsRuntime(this.env as never) ?? undefined;
    const githubHistory = createGithubSnapshotHistoryHelpers(this.env);
    const staticAuditRuntime = createStaticAuditGithubRuntime(this.env);
    const r2 = createSnapshotArchiveStorageRuntime(this.env);
    const snapshotUploadScheduler = getSnapshotUploadWorkflowScheduler(this.env);
    const snapshotsService = createSnapshotsService({
      deleteSnapshotFileObject: r2.deleteSnapshotFileObject,
      getSnapshotById: async (snapshotId) => {
        const { getSnapshotById } = await import("@skills-re/api/modules/snapshots/repo");
        return await getSnapshotById(snapshotId);
      },
      getSnapshotStorageContext: async (snapshotId) => {
        const { getSnapshotStorageContext } = await import("@skills-re/api/modules/snapshots/repo");
        return await getSnapshotStorageContext(snapshotId);
      },
      listSnapshotFiles: async (snapshotId) => {
        const { listSnapshotFiles } = await import("@skills-re/api/modules/snapshots/repo");
        return await listSnapshotFiles(snapshotId);
      },
      putSnapshotFileObject: r2.putSnapshotFileObject,
      snapshotArchiveUploadScheduler: getSnapshotsArchiveUploadWorkflowScheduler(this.env),
      upsertSnapshotFiles: async (snapshotId, files) => {
        const { upsertSnapshotFiles } = await import("@skills-re/api/modules/snapshots/repo");
        await upsertSnapshotFiles(snapshotId, files);
      },
    });
    const snapshotHistory = createSnapshotsHistoryRuntime({
      createHistoricalSnapshot: createHistoricalSnapshotRunner({
        getSnapshotBySkillAndCommit: async (input: HistoricalGetSnapshotBySkillAndCommitInput) =>
          await getSnapshotBySkillAndCommit({
            skillId: asSkillId(input.skillId),
            sourceCommitSha: input.sourceCommitSha,
          }),
        uploadSnapshotFiles: async (input: HistoricalUploadSnapshotFilesInput) => {
          if (!snapshotUploadScheduler) {
            throw new Error("Snapshot upload workflow is not configured.");
          }

          return await snapshotUploadScheduler.enqueue(input);
        },
      }),
      githubHistory,
      listSkillsHistoryInfoByIds,
    });

    return runWorkflowWithFailureLog({
      entrypoint: "SkillsUploadWorkflow",
      instanceId: event.instanceId,
      run: () =>
        runSkillsUploadWorkflow(event, step, {
          aiSearchItems,
          dispatchStaticAuditWorkflow: staticAuditRuntime.dispatchStaticAuditWorkflow,
          reserveAiSearchUploadSlot: async () => await reserveAiSearchUploadSlot(this.env as never),
          scheduleSkillsTagging: getSkillsTaggingWorkflowScheduler(this.env),
          snapshotFilesBucket: this.env.SNAPSHOT_FILES,
          snapshotHistory,
          runUploadSnapshotFilesPipeline: (input) =>
            snapshotsService.runUploadSnapshotFilesPipeline(input),
          snapshotUploadScheduler,
        }),
      workflowName: "skills-re-v1-skills-upload",
    });
  }
}
