import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { runSnapshotUploadWorkflow } from "./snapshot-upload-runner";
import type { SnapshotUploadWorkflowPayload } from "./snapshot-upload";

export class SnapshotUploadWorkflow extends WorkflowEntrypoint<Env, unknown> {
  run(event: Readonly<WorkflowEvent<SnapshotUploadWorkflowPayload>>, step: WorkflowStep) {
    return runSnapshotUploadWorkflow(event, step);
  }
}
