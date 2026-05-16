import type { AiTaskRuntime } from "@skills-re/api/types";
import type { RunSkillsTaggingPipelineOverrides } from "@skills-re/api/modules/tags/service";
import { runSkillsTaggingPipeline } from "@skills-re/api/modules/tags/service";
import { workflowStepRetryPolicy } from "@/lib/workflows/step-retry-policy";
import type { WorkflowCreateBinding } from "./lib/scheduler";
import { makeWorkflowScheduler } from "./lib/scheduler";

export interface SkillsTaggingWorkflowPayload {
  skillIds: string[];
  triggerCategorizationAfterTagging?: boolean;
}

type SkillsCategorizationWorkflowBinding = WorkflowCreateBinding<{
  skillIds: string[];
}>;

export interface RunSkillsTaggingWorkflowDeps {
  aiTasks?: AiTaskRuntime;
  readSnapshotFileContent?: RunSkillsTaggingPipelineOverrides["readSnapshotFileContent"];
  runSkillsTaggingPipeline?: typeof runSkillsTaggingPipeline;
  scheduleCategorization?: (input: { skillIds: string[] }) => Promise<{ workId: string }>;
}

type SkillsTaggingWorkflowResult = Awaited<ReturnType<typeof runSkillsTaggingPipeline>>;
type CategorizationWorkflowScheduler = (input: { skillIds: string[] }) => Promise<{
  workId: string;
}>;

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
      "Skills categorization workflow binding is unavailable. Configure SKILLS_CATEGORIZATION_WORKFLOW.",
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
        "Skills categorization workflow binding is unavailable. Configure SKILLS_CATEGORIZATION_WORKFLOW.",
      );
    }

    await requiredScheduleCategorization({
      skillIds: event.payload.skillIds,
    });
  }

  return result;
};

export const createCategorizationWorkflowScheduler = (
  binding?: SkillsCategorizationWorkflowBinding,
): CategorizationWorkflowScheduler | undefined => {
  if (!binding) {
    return;
  }

  const scheduler = makeWorkflowScheduler("skills-categorization", binding);
  return (input: { skillIds: string[] }) => scheduler.enqueue(input);
};
