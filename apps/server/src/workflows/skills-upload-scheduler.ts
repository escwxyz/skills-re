import type { SkillsUploadScheduler } from "@skills-re/api/types";
import { nanoid } from "nanoid";

import { cleanupStagedSkillsUploadPayload, stageSkillsUploadPayload } from "./skills-upload";
import type { SkillsUploadWorkflowPayload } from "./skills-upload";
import type { WorkflowCreateBinding } from "./lib/scheduler";

type SkillsUploadWorkflowEnv = Env & {
  SKILLS_UPLOAD_WORKFLOW?: WorkflowCreateBinding<SkillsUploadWorkflowPayload>;
};

export const getSkillsUploadWorkflowScheduler = (
  env: SkillsUploadWorkflowEnv,
): SkillsUploadScheduler | null => {
  const binding = env.SKILLS_UPLOAD_WORKFLOW;
  if (!binding) {
    return null;
  }

  return {
    async enqueue(payload) {
      // Stage full content to R2 first — Cloudflare Workflow params have a hard size limit
      // that skill file contents (especially multi-skill repos) can easily exceed.
      const stagingPayload = await stageSkillsUploadPayload(env.SNAPSHOT_FILES, payload);
      try {
        const instance = await binding.create({
          id: `skills-upload-${nanoid()}`,
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
