import { generateSkillSummary } from "@skills-re/api/modules/snapshots/ai-summary";
import type { AiTaskRuntime } from "@skills-re/api/types";

import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";

export interface SkillSummaryWorkflowPayload {
  snapshotId: string;
}

interface WorkflowEvent<TPayload> {
  payload: TPayload;
}

interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export interface RunSkillSummaryWorkflowDeps {
  aiTasks?: AiTaskRuntime;
  generateSkillSummary?: typeof generateSkillSummary;
  readSnapshotFileContent?: (input: {
    path: string;
    snapshotId: string;
  }) => Promise<{ content: string }>;
  setSnapshotDescription?: (input: { description: string; snapshotId: string }) => Promise<void>;
}

export const runSkillSummaryWorkflow = async (
  event: Readonly<WorkflowEvent<SkillSummaryWorkflowPayload>>,
  step: WorkflowStep,
  deps: RunSkillSummaryWorkflowDeps = {},
) => {
  const { snapshotId } = event.payload;

  const content = await step.do(
    "read-skill-content",
    workflowStepRetryPolicy.snapshotUpload,
    async () => {
      if (!deps.readSnapshotFileContent) {
        throw new Error("readSnapshotFileContent is not configured.");
      }
      const result = await deps.readSnapshotFileContent({ path: "SKILL.md", snapshotId });
      return result.content;
    },
  );

  const summary = await step.do(
    "generate-ai-summary",
    workflowStepRetryPolicy.skillSummaryPipeline,
    async () => {
      const { aiTasks } = deps;
      if (!aiTasks) {
        throw new Error("AI tasks runtime is not configured.");
      }
      const generate = deps.generateSkillSummary ?? generateSkillSummary;
      return await generate({ content }, { getAdapters: (task) => aiTasks.getAdapters(task) });
    },
  );

  await step.do("save-skill-summary", workflowStepRetryPolicy.snapshotUpload, async () => {
    if (!deps.setSnapshotDescription) {
      throw new Error("setSnapshotDescription is not configured.");
    }
    await deps.setSnapshotDescription({ description: summary, snapshotId });
  });

  return { snapshotId, summary };
};
