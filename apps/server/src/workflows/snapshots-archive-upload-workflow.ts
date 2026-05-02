import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { createSnapshotArchiveStorageRuntime } from "../lib/cloudflare/r2";
import { createSnapshotsService } from "@skills-re/api/modules/snapshots/service";

import { runSnapshotArchiveUploadWorkflow } from "./snapshots-archive-upload-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { SnapshotArchiveUploadWorkflowPayload } from "./snapshots-archive-upload";

export class SnapshotsArchiveUploadWorkflow extends WorkflowEntrypoint<Env, unknown> {
  run(event: Readonly<WorkflowEvent<SnapshotArchiveUploadWorkflowPayload>>, step: WorkflowStep) {
    const archiveStorage = createSnapshotArchiveStorageRuntime(this.env);
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

    return runWorkflowWithFailureLog({
      entrypoint: "SnapshotsArchiveUploadWorkflow",
      instanceId: event.instanceId,
      run: () => runSnapshotArchiveUploadWorkflow(event, step, { snapshotsService }),
      workflowName: "skills-re-v1-snapshots-archive-upload",
    });
  }
}
