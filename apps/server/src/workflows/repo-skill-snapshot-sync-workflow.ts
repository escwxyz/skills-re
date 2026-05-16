import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

import { createSnapshotsService } from "@skills-re/api/modules/snapshots/service";

import { buildGithubRepoOverview, createGithubHeaders } from "../github-api";
import { createGithubSnapshotHistoryHelpers } from "../github-history";
import { getSnapshotUploadWorkflowScheduler } from "./snapshot-upload";
import { runRepoSkillSnapshotSyncWorkflow } from "./repo-skill-snapshot-sync-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { RepoSkillSnapshotSyncWorkflowPayload } from "./repo-skills-discovery";

export class RepoSkillSnapshotSyncWorkflow extends WorkflowEntrypoint<
  Env,
  RepoSkillSnapshotSyncWorkflowPayload
> {
  run(event: Readonly<WorkflowEvent<RepoSkillSnapshotSyncWorkflowPayload>>, step: WorkflowStep) {
    const githubHistory = createGithubSnapshotHistoryHelpers(this.env);
    const headers = createGithubHeaders(this.env);
    const snapshotUploadScheduler = getSnapshotUploadWorkflowScheduler(this.env);
    const snapshotsService = createSnapshotsService({
      snapshotUploadScheduler,
    });

    return runWorkflowWithFailureLog({
      entrypoint: "RepoSkillSnapshotSyncWorkflow",
      instanceId: event.instanceId,
      run: () =>
        runRepoSkillSnapshotSyncWorkflow(event, step, {
          fetchRepoOverview: async (input) => {
            const overview = await buildGithubRepoOverview(fetch, headers, input.owner, input.repo);
            return {
              commits: overview.commits,
              defaultBranch: overview.defaultBranch,
              headSha: overview.headSha,
            };
          },
          fetchSkillFilesForRoot: githubHistory.fetchSkillFilesForRoot,
          fetchTree: githubHistory.fetchTree,
          uploadSnapshotFiles: (input) =>
            snapshotsService.uploadSnapshotFiles(input, snapshotUploadScheduler),
        }),
      workflowName: "skills-re-v1-repo-skill-snapshot-sync",
    });
  }
}
