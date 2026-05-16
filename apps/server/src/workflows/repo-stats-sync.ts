import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { reposService } from "@skills-re/api/modules/repos/service";

import { createGithubRepoStatsRuntime } from "../github-stats";
import { runRepoStatsSyncWorkflow } from "./repo-stats-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { RepoStatsSyncWorkflowPayload } from "./repo-stats";
import { getRepoSkillsDiscoveryWorkflowScheduler } from "./repo-skills-discovery-scheduler";

export class RepoStatsSyncWorkflow extends WorkflowEntrypoint<Env, unknown> {
  run(event: Readonly<WorkflowEvent<RepoStatsSyncWorkflowPayload>>, step: WorkflowStep) {
    return runWorkflowWithFailureLog({
      entrypoint: "RepoStatsSyncWorkflow",
      instanceId: event.instanceId,
      run: () =>
        runRepoStatsSyncWorkflow(event, step, {
          skillsDiscoveryScheduler: getRepoSkillsDiscoveryWorkflowScheduler(this.env),
          syncStats: (input) =>
            reposService.syncStats(input, {
              fetchRepoStats: createGithubRepoStatsRuntime(this.env).fetchRepoStats,
            }),
        }),
      workflowName: "skills-re-v1-repo-stats-sync",
    });
  }
}
