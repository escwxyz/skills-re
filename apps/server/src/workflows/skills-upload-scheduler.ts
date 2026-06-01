import type { SkillsUploadScheduler } from "@skills-re/api/types";
import { nanoid } from "nanoid";

import { cleanupStagedSkillsUploadPayload, stageSkillsUploadPayload } from "./skills-upload";
import type { SkillsUploadWorkflowPayload } from "./skills-upload";
import type { WorkflowCreateBinding } from "./lib/scheduler";
import { enqueueQueueMessage, getDeterministicQueueDelaySeconds } from "../lib/cloudflare/queues";
import type { QueueBinding } from "../lib/cloudflare/queues";
import type { WorkflowQueueMessage } from "../queues/workflow-queue";

type SkillsUploadWorkflowEnv = Env & {
  SKILLS_UPLOAD_WORKFLOW_QUEUE?: QueueBinding<WorkflowQueueMessage>;
  SKILLS_UPLOAD_WORKFLOW?: WorkflowCreateBinding<SkillsUploadWorkflowPayload>;
};

const SKILLS_UPLOAD_QUEUE_SPREAD_SECONDS = 30;

export const getSkillsUploadWorkflowScheduler = (
  env: SkillsUploadWorkflowEnv,
): SkillsUploadScheduler | null => {
  const binding = env.SKILLS_UPLOAD_WORKFLOW;
  const queueBinding = env.SKILLS_UPLOAD_WORKFLOW_QUEUE;
  if (!binding && !queueBinding) {
    return null;
  }

  return {
    async enqueue(payload) {
      // Stage full content to R2 first — Cloudflare Workflow params have a hard size limit
      // that skill file contents (especially multi-skill repos) can easily exceed.
      const stagingPayload = await stageSkillsUploadPayload(env.SNAPSHOT_FILES, payload);
      try {
        const workflowId = `skills-upload-${nanoid()}`;

        if (queueBinding) {
          await enqueueQueueMessage({
            binding: queueBinding,
            context: "skills-upload",
            delaySeconds: getDeterministicQueueDelaySeconds({
              seed: stagingPayload.stagingKey,
              spreadSeconds: SKILLS_UPLOAD_QUEUE_SPREAD_SECONDS,
            }),
            message: {
              kind: "skills-upload",
              payload: stagingPayload,
              workflowId,
            },
          });
          return { workId: workflowId };
        }

        if (!binding) {
          throw new Error("Skills upload workflow is not configured.");
        }

        const instance = await binding.create({
          id: workflowId,
          params: stagingPayload,
        });
        return { workId: instance.id };
      } catch (error) {
        // No workflow instance will ever run the cleanup step, so delete the staged
        // object here to avoid orphaning it in R2 on transient create failures.
        await cleanupStagedSkillsUploadPayload(env.SNAPSHOT_FILES, stagingPayload);
        throw error;
      }
    },
  };
};
