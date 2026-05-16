import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

import {
  createGithubRepoSkillsDiscoveryDeps,
  runRepoSkillsDiscoveryWorkflow,
} from "./repo-skills-discovery-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { RepoSkillsDiscoveryWorkflowPayload } from "./repo-skills-discovery";
import {
  getRepoSkillImportWorkflowQueueScheduler,
  getRepoSkillSnapshotSyncWorkflowQueueScheduler,
} from "./repo-skills-discovery-scheduler";

export class RepoSkillsDiscoveryWorkflow extends WorkflowEntrypoint<
  Env,
  RepoSkillsDiscoveryWorkflowPayload
> {
  run(event: Readonly<WorkflowEvent<RepoSkillsDiscoveryWorkflowPayload>>, step: WorkflowStep) {
    return runWorkflowWithFailureLog({
      entrypoint: "RepoSkillsDiscoveryWorkflow",
      instanceId: event.instanceId,
      run: () =>
        runRepoSkillsDiscoveryWorkflow(event, step, {
          ...createGithubRepoSkillsDiscoveryDeps(this.env),
          importScheduler: getRepoSkillImportWorkflowQueueScheduler(this.env),
          snapshotSyncScheduler: getRepoSkillSnapshotSyncWorkflowQueueScheduler(this.env),
        }),
      workflowName: "skills-re-v1-repo-skills-discovery",
    });
  }
}
