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

/**
 * Workflow params are either a staging reference (normal path) or the full content
 * payload (legacy inline path, kept for in-flight workflows created before R2 staging).
 */
export type SkillsUploadWorkflowPayload =
  | SkillsUploadWorkflowStagingPayload
  | SkillsUploadContentPayload;

/**
 * Minimal structural interface so callers in tests don't need the full CF runtime.
 * Matches the R2Bucket methods used here; the real binding satisfies it automatically.
 */
export interface SkillsStagingBucket {
  delete(key: string): Promise<void>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  put(
    key: string,
    value: string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}

const SKILLS_UPLOAD_STAGING_PREFIX = "skills-upload/staging";

const isStagingPayload = (
  input: SkillsUploadWorkflowPayload,
): input is SkillsUploadWorkflowStagingPayload =>
  typeof (input as { stagingKey?: unknown }).stagingKey === "string";

export const getSkillsUploadStagingKey = (input: SkillsUploadWorkflowPayload): string | null =>
  isStagingPayload(input) ? input.stagingKey : null;

const buildStagingKey = () => {
  const day = new Date().toISOString().slice(0, 10);
  return `${SKILLS_UPLOAD_STAGING_PREFIX}/${day}/${crypto.randomUUID()}.json`;
};

/**
 * Uploads the full content payload to R2 and returns a small staging reference.
 * Call this before creating the workflow so only the key goes into workflow params —
 * skill file contents can easily exceed the Cloudflare Workflow params size limit.
 */
export const stageSkillsUploadPayload = async (
  bucket: SkillsStagingBucket,
  payload: SkillsUploadContentPayload,
): Promise<SkillsUploadWorkflowStagingPayload> => {
  const key = buildStagingKey();
  await bucket.put(key, JSON.stringify(payload), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return { stagingKey: key };
};

/** Resolves the full content payload from R2 staging or, for legacy inline payloads, validates and returns it directly. */
export const loadStagedSkillsUploadPayload = async (
  bucket: SkillsStagingBucket | null | undefined,
  input: SkillsUploadWorkflowPayload,
): Promise<SkillsUploadContentPayload> => {
  if (!isStagingPayload(input)) {
    // Inline payloads predate R2 staging. Accept them so in-flight workflows aren't broken.
    const inlineValidated = skillsUploadContentPayloadSchema.safeParse(input);
    if (!inlineValidated.success) {
      throw new Error("[skills-upload:validate-inline-payload] invalid legacy payload shape");
    }
    return inlineValidated.data;
  }

  if (!bucket) {
    throw new Error("[skills-upload:load-from-r2] staging bucket not configured");
  }

  const object = await bucket.get(input.stagingKey);
  if (!object) {
    throw new Error("[skills-upload:load-from-r2] staging payload not found");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await object.text());
  } catch {
    throw new Error("[skills-upload:parse-staged-json] failed to parse JSON");
  }

  const validated = skillsUploadContentPayloadSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("[skills-upload:validate-staged-payload] invalid payload shape");
  }
  return validated.data;
};

/** Deletes the R2 staging object after the workflow has finished processing it. No-op for inline payloads. */
export const cleanupStagedSkillsUploadPayload = async (
  bucket: SkillsStagingBucket | null | undefined,
  input: SkillsUploadWorkflowPayload,
): Promise<void> => {
  if (!isStagingPayload(input) || !bucket) {
    return;
  }
  await bucket.delete(input.stagingKey);
};
