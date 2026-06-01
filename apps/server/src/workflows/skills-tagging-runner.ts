import type { AiTaskRuntime } from "@skills-re/api/types";
import type { RunSkillsTaggingPipelineOverrides } from "@skills-re/api/modules/tags/service";
import { runSkillsTaggingPipeline } from "@skills-re/api/modules/tags/service";
import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";

export interface SkillsTaggingWorkflowPayload {
  skillIds: string[];
  triggerCategorizationAfterTagging?: boolean;
}

export interface RunSkillsTaggingWorkflowDeps {
  aiTasks?: AiTaskRuntime;
  readSnapshotFileContent?: RunSkillsTaggingPipelineOverrides["readSnapshotFileContent"];
  runSkillsTaggingPipeline?: typeof runSkillsTaggingPipeline;
  scheduleCategorization?: (input: { skillIds: string[] }) => Promise<{ workId: string }>;
}

type SkillsTaggingWorkflowResult = Awaited<ReturnType<typeof runSkillsTaggingPipeline>>;

export interface WorkflowStep {
  do<T>(name: string, policy: unknown, callback: () => Promise<T>): Promise<T>;
}

export const runSkillsTaggingWorkflow = async (
  event: Readonly<{ payload: SkillsTaggingWorkflowPayload }>,
  deps: RunSkillsTaggingWorkflowDeps = {},
  step?: WorkflowStep,
): Promise<SkillsTaggingWorkflowResult> => {
  const { scheduleCategorization } = deps;
  if (event.payload.triggerCategorizationAfterTagging && !scheduleCategorization) {
    throw new Error(
      "Skills categorization workflow scheduler is unavailable. Configure SKILLS_CATEGORIZATION_WORKFLOW_QUEUE or SKILLS_CATEGORIZATION_WORKFLOW.",
    );
  }

  const pipeline = deps.runSkillsTaggingPipeline ?? runSkillsTaggingPipeline;
  const runPipeline = async () =>
    await pipeline(
      {
        skillIds: event.payload.skillIds,
      },
      deps.aiTasks,
      deps.readSnapshotFileContent
        ? {
            readSnapshotFileContent: deps.readSnapshotFileContent,
          }
        : undefined,
    );
  const result = step
    ? await step.do(
        "run-skills-tagging-pipeline",
        workflowStepRetryPolicy.skillsTaggingPipeline,
        runPipeline,
      )
    : await runPipeline();

  if (event.payload.triggerCategorizationAfterTagging) {
    const requiredScheduleCategorization = scheduleCategorization;
    if (!requiredScheduleCategorization) {
      throw new Error(
        "Skills categorization workflow scheduler is unavailable. Configure SKILLS_CATEGORIZATION_WORKFLOW_QUEUE or SKILLS_CATEGORIZATION_WORKFLOW.",
      );
    }

    await requiredScheduleCategorization({
      skillIds: event.payload.skillIds,
    });
  }

  return result;
};
