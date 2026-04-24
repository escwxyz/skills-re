import type { SkillsUploadScheduler } from "@skills-re/api/types";
import { nanoid } from "nanoid";

import { stageSkillsUploadPayload } from "./skills-upload";
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
      const instance = await binding.create({
        id: `skills-upload-${nanoid()}`,
        params: stagingPayload,
      });
      return { workId: instance.id };
    },
  };
};
