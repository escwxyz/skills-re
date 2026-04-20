import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import type {
  SnapshotHistoryRuntime,
  SnapshotUploadScheduler,
  SkillsTaggingScheduler,
} from "@skills-re/api/types";
import { runUploadSkillsPipeline } from "@skills-re/api/modules/skills/service";

import { loadStagedSkillsUploadPayload } from './skills-upload';
import type { SkillsUploadWorkflowPayload } from './skills-upload';

export interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface RunSkillsUploadWorkflowDeps {
  scheduleSkillsTagging?: SkillsTaggingScheduler | null;
  snapshotHistory?: SnapshotHistoryRuntime | null;
  snapshotUploadScheduler?: SnapshotUploadScheduler | null;
  runUploadSkillsPipeline?: typeof runUploadSkillsPipeline;
}

export const runSkillsUploadWorkflow = async (
  event: Readonly<WorkflowEvent<SkillsUploadWorkflowPayload>>,
  step: WorkflowStep,
  deps: RunSkillsUploadWorkflowDeps = {},
) =>
  await step.do(
    "upload-skills-pipeline",
    workflowStepRetryPolicy.skillsUploadPipeline,
    async () => {
      const payload = await loadStagedSkillsUploadPayload(event.payload);
      const pipeline = deps.runUploadSkillsPipeline ?? runUploadSkillsPipeline;
      return await pipeline(payload, {
        scheduleSkillsTagging: deps.scheduleSkillsTagging ?? null,
        snapshotHistory: deps.snapshotHistory ?? null,
        snapshotUploadScheduler: deps.snapshotUploadScheduler ?? null,
      });
    },
  );
