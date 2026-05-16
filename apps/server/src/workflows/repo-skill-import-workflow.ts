import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

import { createGithubSubmitRuntime } from "../github-submit";
import { getSkillsUploadWorkflowScheduler } from "./skills-upload-scheduler";
import { runRepoSkillImportWorkflow } from "./repo-skill-import-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { RepoSkillImportWorkflowPayload } from "./repo-skills-discovery";

export class RepoSkillImportWorkflow extends WorkflowEntrypoint<
  Env,
  RepoSkillImportWorkflowPayload
> {
  run(event: Readonly<WorkflowEvent<RepoSkillImportWorkflowPayload>>, step: WorkflowStep) {
    return runWorkflowWithFailureLog({
      entrypoint: "RepoSkillImportWorkflow",
      instanceId: event.instanceId,
      run: () =>
        runRepoSkillImportWorkflow(event, step, {
          githubSubmit: createGithubSubmitRuntime(this.env),
          skillsUploadScheduler: getSkillsUploadWorkflowScheduler(this.env),
        }),
      workflowName: "skills-re-v1-repo-skill-import",
    });
  }
}
