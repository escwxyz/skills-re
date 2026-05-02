import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { createGithubSnapshotHistoryHelpers } from "../github-history";
import { createSnapshotsHistoryRuntime } from "../snapshots-history";
import { getSnapshotUploadWorkflowScheduler } from "./snapshot-upload";
import { getSkillsTaggingWorkflowScheduler } from "./skills-tagging-scheduler";
import { runSkillsUploadWorkflow } from "./skills-upload-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { SkillsUploadWorkflowPayload } from "./skills-upload";
import { createHistoricalSnapshot } from "@skills-re/api/modules/snapshots/service";
import { listSkillsHistoryInfoByIds } from "@skills-re/api/modules/skills/repo";

export class SkillsUploadWorkflow extends WorkflowEntrypoint<Env, unknown> {
  run(event: Readonly<WorkflowEvent<SkillsUploadWorkflowPayload>>, step: WorkflowStep) {
    const githubHistory = createGithubSnapshotHistoryHelpers(this.env);
    const snapshotHistory = createSnapshotsHistoryRuntime({
      createHistoricalSnapshot,
      githubHistory,
      listSkillsHistoryInfoByIds,
    });

    return runWorkflowWithFailureLog({
      entrypoint: "SkillsUploadWorkflow",
      instanceId: event.instanceId,
      run: () =>
        runSkillsUploadWorkflow(event, step, {
          scheduleSkillsTagging: getSkillsTaggingWorkflowScheduler(this.env),
          snapshotFilesBucket: this.env.SNAPSHOT_FILES,
          snapshotHistory,
          snapshotUploadScheduler: getSnapshotUploadWorkflowScheduler(this.env),
        }),
      workflowName: "skills-re-v1-skills-upload",
    });
  }
}
