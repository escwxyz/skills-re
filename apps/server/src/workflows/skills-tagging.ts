import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

import { createAiTasksRuntime } from "../ai-tasks";
import { createSnapshotArchiveStorageRuntime } from "../lib/cloudflare/r2";
import {
  createCategorizationWorkflowScheduler,
  runSkillsTaggingWorkflow,
} from "./skills-tagging-runner";
import type { SkillsTaggingWorkflowPayload } from "./skills-tagging-runner";
import type { WorkflowCreateBinding } from "./lib/scheduler";
import { createSnapshotsService } from "@skills-re/api/modules/snapshots/service";

type SkillsTaggingWorkflowEnv = Env & {
  SKILLS_CATEGORIZATION_WORKFLOW?: WorkflowCreateBinding<{
    skillIds: string[];
  }>;
};

export class SkillsTaggingWorkflow extends WorkflowEntrypoint<Env, SkillsTaggingWorkflowPayload> {
  run(event: Readonly<WorkflowEvent<SkillsTaggingWorkflowPayload>>, _step: WorkflowStep) {
    const env = this.env as SkillsTaggingWorkflowEnv;
    const aiTasks = createAiTasksRuntime(env);
    const snapshotStorage = createSnapshotArchiveStorageRuntime(env);
    const snapshotsService = createSnapshotsService({
      buildSnapshotFilePublicUrl: snapshotStorage.buildSnapshotFilePublicUrl,
      readSnapshotFileObject: snapshotStorage.getSnapshotFileObject,
    });
    const scheduleCategorization = createCategorizationWorkflowScheduler(
      env.SKILLS_CATEGORIZATION_WORKFLOW,
    );

    return runSkillsTaggingWorkflow(event, {
      aiTasks,
      readSnapshotFileContent: snapshotsService.readSnapshotFileContent,
      scheduleCategorization,
    });
  }
}

export type { SkillsTaggingWorkflowPayload } from "./skills-tagging-runner";
export { runSkillsTaggingWorkflow } from "./skills-tagging-runner";
