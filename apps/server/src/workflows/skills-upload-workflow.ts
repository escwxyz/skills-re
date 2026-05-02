import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { asSkillId } from "@skills-re/db/utils";
import { createGithubSnapshotHistoryHelpers } from "../github-history";
import { createSnapshotsHistoryRuntime } from "../snapshots-history";
import { getSnapshotUploadWorkflowScheduler } from "./snapshot-upload";
import { getSkillsTaggingWorkflowScheduler } from "./skills-tagging-scheduler";
import { runSkillsUploadWorkflow } from "./skills-upload-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { SkillsUploadWorkflowPayload } from "./skills-upload";
import { createHistoricalSnapshotRunner } from "@skills-re/api/modules/snapshots/service";
import {
  getSnapshotBySkillAndCommit,
  listSkillsHistoryInfoByIds,
} from "@skills-re/api/modules/skills/repo";

export class SkillsUploadWorkflow extends WorkflowEntrypoint<Env, unknown> {
  run(event: Readonly<WorkflowEvent<SkillsUploadWorkflowPayload>>, step: WorkflowStep) {
    const githubHistory = createGithubSnapshotHistoryHelpers(this.env);
    const snapshotUploadScheduler = getSnapshotUploadWorkflowScheduler(this.env);
    const snapshotHistory = createSnapshotsHistoryRuntime({
      createHistoricalSnapshot: createHistoricalSnapshotRunner({
        getSnapshotBySkillAndCommit: async (input) =>
          await getSnapshotBySkillAndCommit({
            skillId: asSkillId(input.skillId),
            sourceCommitSha: input.sourceCommitSha,
          }),
        uploadSnapshotFiles: async (input) => {
          if (!snapshotUploadScheduler) {
            throw new Error("Snapshot upload workflow is not configured.");
          }

          return await snapshotUploadScheduler.enqueue(input);
        },
      }),
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
          snapshotUploadScheduler,
        }),
      workflowName: "skills-re-v1-skills-upload",
    });
  }
}
