import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

import { createAiTasksRuntime } from "../ai-tasks";
import { createCategorizationWorkflowScheduler, runSkillsTaggingWorkflow } from './skills-tagging-runner';
import type { SkillsTaggingWorkflowPayload } from './skills-tagging-runner';

type SkillsTaggingWorkflowEnv = Env & {
  SKILLS_CATEGORIZATION_WORKFLOW?: {
    create: (options?: { id?: string; params?: { skillIds: string[] } }) => Promise<{ id: string }>;
  };
};

export class SkillsTaggingWorkflow extends WorkflowEntrypoint<Env, SkillsTaggingWorkflowPayload> {
  run(event: Readonly<WorkflowEvent<SkillsTaggingWorkflowPayload>>, _step: WorkflowStep) {
    const env = this.env as SkillsTaggingWorkflowEnv;
    const aiTasks = createAiTasksRuntime(env);
    const scheduleCategorization = createCategorizationWorkflowScheduler(
      env.SKILLS_CATEGORIZATION_WORKFLOW,
    );

    return runSkillsTaggingWorkflow(event, {
      aiTasks,
      scheduleCategorization,
    });
  }
}

export type { SkillsTaggingWorkflowPayload } from "./skills-tagging-runner";
export { runSkillsTaggingWorkflow } from "./skills-tagging-runner";
