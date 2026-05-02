import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { createSnapshotArchiveStorageRuntime } from "../lib/cloudflare/r2";
import { createSnapshotsService } from "@skills-re/api/modules/snapshots/service";
import { createWorkerLogger } from "../worker-logger";

import { runSnapshotArchiveUploadWorkflow } from "./snapshots-archive-upload-runner";
import type { SnapshotArchiveUploadWorkflowPayload } from "./snapshots-archive-upload";

export class SnapshotsArchiveUploadWorkflow extends WorkflowEntrypoint<Env, unknown> {
  async run(
    event: Readonly<WorkflowEvent<SnapshotArchiveUploadWorkflowPayload>>,
    step: WorkflowStep,
  ) {
    const archiveStorage = createSnapshotArchiveStorageRuntime(this.env);
    const logger = createWorkerLogger({
      component: "workflow",
      instanceId: event.instanceId,
      workflowName: "SnapshotsArchiveUploadWorkflow",
    });
    const snapshotsService = createSnapshotsService({
      getSnapshotArchiveStagingObject: archiveStorage.getSnapshotArchiveStagingObject,
      getSnapshotStorageContext: async (snapshotId) => {
        const { getSnapshotStorageContext } = await import("@skills-re/api/modules/snapshots/repo");
        return await getSnapshotStorageContext(snapshotId);
      },
      putSnapshotArchiveObject: archiveStorage.putSnapshotArchiveObject,
      putSnapshotArchiveStagingObject: archiveStorage.putSnapshotArchiveStagingObject,
      readSnapshotFileObject: archiveStorage.getSnapshotFileObject,
    });

    try {
      return await runSnapshotArchiveUploadWorkflow(event, step, { snapshotsService });
    } catch (error) {
      logger.error("workflow.failed", {
        error: error instanceof Error ? error : new Error(String(error)),
        snapshotId: event.payload.snapshotId,
      });
      throw error;
    }
  }
}
