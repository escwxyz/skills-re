import { WorkflowEntrypoint } from "cloudflare:workers";

import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { runRepoSnapshotSyncWorkflow } from "./repo-snapshot-sync-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { RepoSnapshotSyncWorkflowPayload } from "./repo-snapshot-sync";

export class RepoSnapshotSyncWorkflow extends WorkflowEntrypoint<Env, unknown> {
  // oxlint-disable-next-line class-methods-use-this
  run(event: Readonly<WorkflowEvent<RepoSnapshotSyncWorkflowPayload>>, step: WorkflowStep) {
    return runWorkflowWithFailureLog({
      entrypoint: "RepoSnapshotSyncWorkflow",
      instanceId: event.instanceId,
      run: () => runRepoSnapshotSyncWorkflow(event, step),
      workflowName: "skills-re-v1-repo-snapshot-sync",
    });
  }
}
