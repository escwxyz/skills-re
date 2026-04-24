import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { createSnapshotArchiveStorageRuntime } from "../lib/cloudflare/r2";
import { createSnapshotsService } from "@skills-re/api/modules/snapshots/service";
import { getSnapshotsArchiveUploadWorkflowScheduler } from "./snapshots-archive-upload";

import { runSnapshotUploadWorkflow } from "./snapshot-upload-runner";
import type { SnapshotUploadWorkflowPayload } from "./snapshot-upload";

export class SnapshotUploadWorkflow extends WorkflowEntrypoint<Env, unknown> {
  // oxlint-disable-next-line class-methods-use-this
  run(event: Readonly<WorkflowEvent<SnapshotUploadWorkflowPayload>>, step: WorkflowStep) {
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

    return runSnapshotUploadWorkflow(event, step, {
      runUploadSnapshotFiles: (input) => snapshotsService.runUploadSnapshotFilesPipeline(input),
    });
  }
}
