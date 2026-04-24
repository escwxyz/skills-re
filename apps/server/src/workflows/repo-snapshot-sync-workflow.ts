import { WorkflowEntrypoint } from "cloudflare:workers";

import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { runRepoSnapshotSyncWorkflow } from "./repo-snapshot-sync-runner";
import type { RepoSnapshotSyncWorkflowPayload } from "./repo-snapshot-sync";

export class RepoSnapshotSyncWorkflow extends WorkflowEntrypoint<Env, unknown> {
  // oxlint-disable-next-line class-methods-use-this
  run(event: Readonly<WorkflowEvent<RepoSnapshotSyncWorkflowPayload>>, step: WorkflowStep) {
    return runRepoSnapshotSyncWorkflow(event, step);
  }
}
