import { z } from "zod/v4";

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

export type SkillsUploadContentPayload = z.infer<typeof skillsUploadContentPayloadSchema>;

export type SkillsUploadWorkflowPayload =
  | SkillsUploadWorkflowStagingPayload
  | SkillsUploadContentPayload;

const isStagingPayload = (
  input: SkillsUploadWorkflowPayload,
): input is SkillsUploadWorkflowStagingPayload =>
  typeof (input as { stagingKey?: unknown }).stagingKey === "string";

export const getSkillsUploadStagingKey = (input: SkillsUploadWorkflowPayload): string | null =>
  isStagingPayload(input) ? input.stagingKey : null;

// Staging is intentionally stubbed for now; the inline upload payload is the supported path.
export const loadStagedSkillsUploadPayload = (
  input: SkillsUploadWorkflowPayload,
): Promise<SkillsUploadContentPayload> => {
  if (!isStagingPayload(input)) {
    const inlineValidated = skillsUploadContentPayloadSchema.safeParse(input);
    if (!inlineValidated.success) {
      return Promise.reject(
        new Error("[skills-upload:validate-inline-payload] invalid legacy payload shape"),
      );
    }
    return Promise.resolve(inlineValidated.data);
  }

  return Promise.reject(new Error("Skill upload staging is not configured."));
};

export const cleanupStagedSkillsUploadPayload = (_input: SkillsUploadWorkflowPayload) => {
  void _input;
};
