import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

import { createGithubSnapshotHistoryHelpers } from "../github-history";
import { createSnapshotArchiveStorageRuntime } from "../lib/cloudflare/r2";
import { createSnapshotsService } from "@skills-re/api/modules/snapshots/service";
import { getSnapshotsArchiveUploadWorkflowScheduler } from "./snapshots-archive-upload";
import { getSnapshotRawFilesBackfillWorkflowScheduler } from "./snapshot-raw-files-backfill";
import { runSnapshotRawFilesBackfillWorkflow } from "./snapshot-raw-files-backfill-runner";
import type { SnapshotRawFilesBackfillWorkflowPayload } from "./snapshot-raw-files-backfill";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";

export class SnapshotRawFilesBackfillWorkflow extends WorkflowEntrypoint<
  Env,
  SnapshotRawFilesBackfillWorkflowPayload
> {
  async run(
    event: Readonly<WorkflowEvent<SnapshotRawFilesBackfillWorkflowPayload>>,
    step: WorkflowStep,
  ) {
    const githubHistory = createGithubSnapshotHistoryHelpers(this.env);
    const r2 = createSnapshotArchiveStorageRuntime(this.env);
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

    return await runWorkflowWithFailureLog({
      entrypoint: "SnapshotRawFilesBackfillWorkflow",
      instanceId: event.instanceId,
      run: async () => {
        const { listLatestSnapshotsForRawFilesBackfill } =
          await import("@skills-re/api/modules/snapshots/repo");

        return await runSnapshotRawFilesBackfillWorkflow(
          {
            payload: event.payload,
          },
          step,
          {
            fetchCommitSha: githubHistory.fetchCommitSha,
            fetchSkillFilesForRoot: githubHistory.fetchSkillFilesForRoot,
            fetchTree: githubHistory.fetchTree,
            hasGithubToken: githubHistory.hasGithubToken,
            listLatestSnapshotsForRawFilesBackfill,
            runUploadSnapshotFilesPipeline: (input) =>
              snapshotsService.runUploadSnapshotFilesPipeline(input),
            scheduleContinuation: getSnapshotRawFilesBackfillWorkflowScheduler(this.env),
          },
        );
      },
      workflowName: "skills-re-v1-snapshot-raw-files-backfill",
    });
  }
}
