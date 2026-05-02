import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { createAiTasksRuntime } from "../ai-tasks";
import { createSnapshotArchiveStorageRuntime } from "../lib/cloudflare/r2";
import { createSnapshotsService } from "@skills-re/api/modules/snapshots/service";

import { runSkillSummaryWorkflow } from "./skill-summary-runner";
import { runWorkflowWithFailureLog } from "./workflow-failure-log";
import type { SkillSummaryWorkflowPayload } from "./skill-summary";

export class SkillSummaryWorkflow extends WorkflowEntrypoint<Env, SkillSummaryWorkflowPayload> {
  run(event: Readonly<WorkflowEvent<SkillSummaryWorkflowPayload>>, step: WorkflowStep) {
    const aiTasks = createAiTasksRuntime(this.env);
    const snapshotStorage = createSnapshotArchiveStorageRuntime(this.env);
    const snapshotsService = createSnapshotsService({
      buildSnapshotFilePublicUrl: snapshotStorage.buildSnapshotFilePublicUrl,
      readSnapshotFileObject: snapshotStorage.getSnapshotFileObject,
    });

    return runWorkflowWithFailureLog({
      entrypoint: "SkillSummaryWorkflow",
      instanceId: event.instanceId,
      run: () =>
        runSkillSummaryWorkflow(event, step, {
          aiTasks,
          readSnapshotFileContent: snapshotsService.readSnapshotFileContent,
          setSnapshotDescription: async (input) => {
            const { setSnapshotDescription } =
              await import("@skills-re/api/modules/snapshots/repo");
            await setSnapshotDescription(input);
          },
        }),
      workflowName: "skills-re-v1-skill-summary",
    });
  }
}

export type { SkillSummaryWorkflowPayload } from "./skill-summary";
export { runSkillSummaryWorkflow } from "./skill-summary-runner";
