import type { SkillsTaggingScheduler } from "@skills-re/api/types";
import { nanoid } from "nanoid";

import { makeWorkflowScheduler } from "./lib/scheduler";
import type { WorkflowCreateBinding } from "./lib/scheduler";
import { enqueueQueueMessage } from "../lib/cloudflare/queues";
import type { QueueBinding } from "../lib/cloudflare/queues";
import type { WorkflowQueueMessage } from "../queues/workflow-queue";
import { reserveWorkflowRateLimitSlot } from "@/lib/workflows/rate-limit-reservation";
import type { WorkflowRateLimiterNamespace } from "@/lib/workflows/rate-limit-reservation";

interface SkillsTaggingWorkflowEnv {
  AI_WORKFLOW_RATE_LIMITER?: unknown;
  AI_WORKFLOW_DAILY_SKILL_LIMIT?: string;
  AI_WORKFLOW_SPACING_SECONDS?: string;
  SKILLS_TAGGING_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
  SKILLS_TAGGING_WORKFLOW?: WorkflowCreateBinding<{
    skillIds: string[];
    triggerCategorizationAfterTagging?: boolean;
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

export const getSkillsTaggingWorkflowScheduler = (
  env: SkillsTaggingWorkflowEnv,
): SkillsTaggingScheduler | null => {
  const binding = env.SKILLS_TAGGING_WORKFLOW;
  const queueBinding = env.SKILLS_TAGGING_WORKFLOW_QUEUE;
  if (!binding && !queueBinding) {
    return null;
  }

  return {
    async enqueue(payload) {
      const workflowId = `skills-tagging-${nanoid()}`;

      if (queueBinding) {
        const reservation = await reserveWorkflowRateLimitSlot({
          dailyLimit: parsePositiveInteger(
            env.AI_WORKFLOW_DAILY_SKILL_LIMIT,
            DEFAULT_AI_WORKFLOW_DAILY_SKILL_LIMIT,
          ),
          namespace: env.AI_WORKFLOW_RATE_LIMITER as WorkflowRateLimiterNamespace | undefined,
          scope: "skills-tagging",
          spacingMs:
            parsePositiveInteger(
              env.AI_WORKFLOW_SPACING_SECONDS,
              DEFAULT_AI_WORKFLOW_SPACING_SECONDS,
            ) * 1000,
          units: payload.skillIds.length,
        });
        await enqueueQueueMessage({
          binding: queueBinding,
          context: "skills-tagging",
          delaySeconds: reservation.delaySeconds,
          message: {
            kind: "skills-tagging",
            notBeforeMs: reservation.notBeforeMs,
            payload,
            workflowId,
          },
        });
        return { workId: workflowId };
      }

      if (!binding) {
        throw new Error("Skills tagging workflow is not configured.");
      }

      return await makeWorkflowScheduler("skills-tagging", binding).enqueue(payload);
    },
  };
};
