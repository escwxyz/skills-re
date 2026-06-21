import { z } from "zod";

import { searchSkillListItemSchema } from "./common/content";
import { idSchema } from "./common/ids";

const sha256DigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const generationIdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
const publicHttpUrlSchema = z.url().refine((value) => {
  const { protocol } = new URL(value);
  return protocol === "https:" || protocol === "http:";
}, "URL must use HTTP or HTTPS.");

export const pagefindExportInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const pagefindExportRecordSchema = z.object({
  artifactDigest: sha256DigestSchema,
  artifactUrl: publicHttpUrlSchema,
  authorHandle: z.string().min(1),
  canonicalUrl: z.string().startsWith("/"),
  description: z.string(),
  isVerified: z.boolean(),
  primaryCategory: z.string().min(1).nullable(),
  repoName: z.string().min(1),
  skillId: idSchema,
  skillSlug: z.string().min(1),
  snapshotId: idSchema,
  tags: z.array(z.string().min(1)),
  title: z.string().min(1),
  updatedAt: z.number().int().nonnegative(),
});

export const pagefindExportPageSchema = z.object({
  continueCursor: z.string(),
  isDone: z.boolean(),
  page: z.array(pagefindExportRecordSchema),
  sourceWatermark: z.number().int().nonnegative(),
});

export const pagefindHydrationInputSchema = z.object({
  skillIds: z
    .array(idSchema)
    .min(1)
    .max(50)
    .refine((skillIds) => new Set(skillIds).size === skillIds.length, "Skill IDs must be unique."),
});

export const pagefindHydrationOutputSchema = z.array(searchSkillListItemSchema);

export const pagefindSearchHitMetadataSchema = z.object({
  author: z.string(),
  description: z.string(),
  repository: z.string(),
  skillId: idSchema,
  snapshotId: idSchema,
  title: z.string(),
});

export const pagefindGenerationManifestSchema = z.object({
  bundleUrl: publicHttpUrlSchema.refine((value) => value.endsWith("/"), "Bundle URL must end in /"),
  generationId: generationIdSchema,
  pagefindVersion: z.string().min(1),
  publishedAt: z.number().int().nonnegative(),
  recordCount: z.number().int().nonnegative(),
  schemaVersion: z.literal(1),
  sourceWatermark: z.number().int().nonnegative(),
});

export type PagefindExportInput = z.infer<typeof pagefindExportInputSchema>;
export type PagefindExportPage = z.infer<typeof pagefindExportPageSchema>;
export type PagefindExportRecord = z.infer<typeof pagefindExportRecordSchema>;
export type PagefindGenerationManifest = z.infer<typeof pagefindGenerationManifestSchema>;
export type PagefindSearchHitMetadata = z.infer<typeof pagefindSearchHitMetadataSchema>;
