import { nanoid } from "nanoid";

import { enqueueQueueMessage } from "../lib/cloudflare/queues";
import type { QueueBinding } from "../lib/cloudflare/queues";
import type { WorkflowQueueMessage } from "../queues/workflow-queue";
import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";
import { reserveWorkflowRateLimitSlot } from "@/lib/workflows/rate-limit-reservation";
import type { WorkflowRateLimiterNamespace } from "@/lib/workflows/rate-limit-reservation";

export interface SkillsCategorizationScheduler {
  enqueue(input: { skillIds: string[] }): Promise<{ workId: string }>;
}

interface SkillsCategorizationWorkflowEnv {
  AI_WORKFLOW_RATE_LIMITER?: unknown;
  AI_WORKFLOW_DAILY_SKILL_LIMIT?: string;
  AI_WORKFLOW_SPACING_SECONDS?: string;
  SKILLS_CATEGORIZATION_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
  SKILLS_CATEGORIZATION_WORKFLOW?: WorkflowCreateBinding<{
    skillIds: string[];
  }>;
}

const DEFAULT_AI_WORKFLOW_DAILY_SKILL_LIMIT = 100;
const DEFAULT_AI_WORKFLOW_SPACING_SECONDS = 60;

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getSkillsCategorizationWorkflowScheduler = (
  env: SkillsCategorizationWorkflowEnv,
): SkillsCategorizationScheduler | null => {
  const binding = env.SKILLS_CATEGORIZATION_WORKFLOW;
  const queueBinding = env.SKILLS_CATEGORIZATION_WORKFLOW_QUEUE;
  if (!binding && !queueBinding) {
    return null;
  }

  return {
    async enqueue(payload) {
      const workflowId = `skills-categorization-${nanoid()}`;

      if (queueBinding) {
        const reservation = await reserveWorkflowRateLimitSlot({
          dailyLimit: parsePositiveInteger(
            env.AI_WORKFLOW_DAILY_SKILL_LIMIT,
            DEFAULT_AI_WORKFLOW_DAILY_SKILL_LIMIT,
          ),
          namespace: env.AI_WORKFLOW_RATE_LIMITER as WorkflowRateLimiterNamespace | undefined,
          scope: "skills-categorization",
          spacingMs:
            parsePositiveInteger(
              env.AI_WORKFLOW_SPACING_SECONDS,
              DEFAULT_AI_WORKFLOW_SPACING_SECONDS,
            ) * 1000,
          units: payload.skillIds.length,
        });
        await enqueueQueueMessage({
          binding: queueBinding,
          context: "skills-categorization",
          delaySeconds: reservation.delaySeconds,
          message: {
            kind: "skills-categorization",
            notBeforeMs: reservation.notBeforeMs,
            payload,
            workflowId,
          },
        });
        return { workId: workflowId };
      }

      if (!binding) {
        throw new Error("Skills categorization workflow is not configured.");
      }

      return await makeWorkflowScheduler("skills-categorization", binding).enqueue(payload);
    },
  };
};
