import { nanoid } from "nanoid";
import { z } from "zod/v4";

import type { SkillsUploadScheduler } from "@skills-re/api/types";

interface WorkflowCreateBinding<TPayload> {
  create: (options?: { id?: string; params?: TPayload }) => Promise<{ id: string }>;
}

const skillsUploadContentPayloadSchema = z.object({
  recentCommits: z
    .array(
      z.object({
        committedDate: z.string().nullable().optional(),
        message: z.string().nullable().optional(),
        sha: z.string(),
        url: z.string().nullable().optional(),
      }),
    )
    .optional(),
  repo: z
    .object({
      createdAt: z.number(),
      defaultBranch: z.string(),
      forks: z.number(),
      license: z.string(),
      nameWithOwner: z.string(),
      owner: z.object({
        avatarUrl: z.string().optional(),
        handle: z.string(),
        name: z.string().optional(),
      }),
      stars: z.number(),
      updatedAt: z.number(),
    })
    .optional(),
  skills: z
    .array(
      z.object({
        description: z.string(),
        directoryPath: z.string(),
        entryPath: z.string(),
        frontmatterHash: z.string().optional(),
        initialSnapshot: z.object({
          files: z.array(
            z.object({
              content: z.string(),
              path: z.string(),
            }),
          ),
          sourceCommitDate: z.number(),
          sourceCommitMessage: z.string().optional(),
          sourceCommitSha: z.string(),
          sourceCommitUrl: z.string().optional(),
          sourceRef: z.string(),
          tree: z.array(
            z.object({
              path: z.string(),
              sha: z.string(),
              size: z.number().optional(),
              type: z.enum(["blob", "tree"]),
            }),
          ),
        }),
        license: z.string().optional(),
        preferredVersion: z.string().min(1).optional(),
        slug: z.string(),
        sourceLocator: z.string(),
        sourceType: z.enum(["github", "upload"]),
        skillContentHash: z.string().optional(),
        tags: z.array(z.string()).optional(),
        title: z.string(),
      }),
    )
    .min(1),
});

export interface SkillsUploadWorkflowStagingPayload {
  stagingKey: string;
}

export type SkillsUploadWorkflowPayload =
  | SkillsUploadWorkflowStagingPayload
  | z.infer<typeof skillsUploadContentPayloadSchema>;

type SkillsUploadWorkflowEnv = Env & {
  SKILLS_UPLOAD_WORKFLOW?: WorkflowCreateBinding<SkillsUploadWorkflowPayload>;
};

const createWorkflowInstanceId = () => `skills-upload-${nanoid()}`;

const isStagingPayload = (
  input: SkillsUploadWorkflowPayload,
): input is SkillsUploadWorkflowStagingPayload =>
  typeof (input as { stagingKey?: unknown }).stagingKey === "string";

export const getSkillsUploadStagingKey = (input: SkillsUploadWorkflowPayload) =>
  isStagingPayload(input) ? input.stagingKey : null;

export const loadStagedSkillsUploadPayload = async (input: SkillsUploadWorkflowPayload) => {
  if (!isStagingPayload(input)) {
    const inlineValidated = skillsUploadContentPayloadSchema.safeParse(input);
    if (!inlineValidated.success) {
      throw new Error("[skills-upload:validate-inline-payload] invalid legacy payload shape");
    }
    return inlineValidated.data;
  }

  throw new Error("Skill upload staging is not configured.");
};

export const cleanupStagedSkillsUploadPayload = async (_input: SkillsUploadWorkflowPayload) => {
  return;
};

export const createSkillsUploadWorkflowScheduler = (
  binding: WorkflowCreateBinding<SkillsUploadWorkflowPayload>,
): SkillsUploadScheduler => ({
  async enqueue(payload) {
    const instance = await binding.create({
      id: createWorkflowInstanceId(),
      params: payload,
    });

    return { workId: instance.id };
  },
});

export const getSkillsUploadWorkflowScheduler = (
  env: SkillsUploadWorkflowEnv,
): SkillsUploadScheduler | null => {
  const binding = env.SKILLS_UPLOAD_WORKFLOW;
  return binding ? createSkillsUploadWorkflowScheduler(binding) : null;
};
