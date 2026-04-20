import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";

import { createAiTasksRuntime } from "../ai-tasks";
import { runSkillsCategorizationWorkflow } from './skills-categorization-runner';
import type { SkillsCategorizationWorkflowPayload } from './skills-categorization-runner';

export class SkillsCategorizationWorkflow extends WorkflowEntrypoint<
  Env,
  SkillsCategorizationWorkflowPayload
> {
  run(event: Readonly<WorkflowEvent<SkillsCategorizationWorkflowPayload>>, _step: WorkflowStep) {
    const aiTasks = createAiTasksRuntime(this.env);
    return runSkillsCategorizationWorkflow(event, {
      aiTasks,
    });
  }
}

export type { SkillsCategorizationWorkflowPayload } from "./skills-categorization-runner";
export { runSkillsCategorizationWorkflow } from "./skills-categorization-runner";
