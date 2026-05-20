import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

import { createAiTasksRuntime } from "../ai-tasks";
import { createSnapshotArchiveStorageRuntime } from "../lib/cloudflare/r2";
import { getSkillsCategorizationWorkflowScheduler } from "./skills-categorization-scheduler";
import { runSkillsTaggingWorkflow } from "./skills-tagging-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { SkillsTaggingWorkflowPayload } from "./skills-tagging-runner";
import { createSnapshotsService } from "@skills-re/api/modules/snapshots/service";

export class SkillsTaggingWorkflow extends WorkflowEntrypoint<Env, SkillsTaggingWorkflowPayload> {
  run(event: Readonly<WorkflowEvent<SkillsTaggingWorkflowPayload>>, _step: WorkflowStep) {
    const aiTasks = createAiTasksRuntime(this.env);
    const snapshotStorage = createSnapshotArchiveStorageRuntime(this.env);
    const snapshotsService = createSnapshotsService({
      buildSnapshotFilePublicUrl: snapshotStorage.buildSnapshotFilePublicUrl,
      readSnapshotFileObject: snapshotStorage.getSnapshotFileObject,
    });
    const categorizationScheduler = getSkillsCategorizationWorkflowScheduler(this.env);

    return runWorkflowWithFailureLog({
      entrypoint: "SkillsTaggingWorkflow",
      instanceId: event.instanceId,
      run: () =>
        runSkillsTaggingWorkflow(
          event,
          {
            aiTasks,
            readSnapshotFileContent: snapshotsService.readSnapshotFileContent,
            scheduleCategorization: categorizationScheduler?.enqueue,
          },
          _step,
        ),
      workflowName: "skills-re-v1-skills-tagging",
    });
  }
}

export type { SkillsTaggingWorkflowPayload } from "./skills-tagging-runner";
export { runSkillsTaggingWorkflow } from "./skills-tagging-runner";
