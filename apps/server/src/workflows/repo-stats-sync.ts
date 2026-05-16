import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { runRepoStatsSyncWorkflow } from "./repo-stats-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { RepoStatsSyncWorkflowPayload } from "./repo-stats";

export class RepoStatsSyncWorkflow extends WorkflowEntrypoint<Env, unknown> {
  // oxlint-disable-next-line class-methods-use-this
  run(event: Readonly<WorkflowEvent<RepoStatsSyncWorkflowPayload>>, step: WorkflowStep) {
    return runWorkflowWithFailureLog({
      entrypoint: "RepoStatsSyncWorkflow",
      instanceId: event.instanceId,
      run: () => runRepoStatsSyncWorkflow(event, step),
      workflowName: "skills-re-v1-repo-stats-sync",
    });
  }
}
