import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { getRepoSnapshotSyncWorkflowScheduler } from "./repo-snapshot-sync";
import { runRepoStatsSyncWorkflow } from "./repo-stats-runner";
import type { RepoStatsSyncWorkflowPayload } from "./repo-stats";

export class RepoStatsSyncWorkflow extends WorkflowEntrypoint<Env, unknown> {
  run(event: Readonly<WorkflowEvent<RepoStatsSyncWorkflowPayload>>, step: WorkflowStep) {
    return runRepoStatsSyncWorkflow(event, step, {
      snapshotSyncScheduler: getRepoSnapshotSyncWorkflowScheduler(this.env),
    });
  }
}
