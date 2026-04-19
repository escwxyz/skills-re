import { z } from "zod";

import { idSchema } from "./ids";
import { githubOwnerSchema, githubRepoSchema } from "./slugs";

// Shared snapshot schemas stay here so routes and downstream services can reuse them.
export const githubCommitSchema = z.object({
  committedDate: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  sha: z.string(),
  url: z.string().nullable().optional(),
});

export const fileContentSchema = z.object({
  content: z.string(),
  path: z.string(),
});

export const treeEntrySchema = z.object({
  path: z.string(),
  sha: z.string(),
  size: z.number().optional(),
  type: z.enum(["blob", "tree"]),
});

export const snapshotDownloadEntrySchema = z.object({
  contentType: z.string().optional(),
  path: z.string(),
  size: z.number(),
  url: z.string(),
});

export const snapshotFileManifestEntrySchema = z.object({
  contentType: z.string().optional(),
  fileHash: z.string(),
  path: z.string(),
  r2Key: z.string().optional(),
  size: z.number(),
  sourceSha: z.string().optional(),
});

export const snapshotFileEntrySchema = z.object({
  contentType: z.string().optional(),
  fileHash: z.string().optional(),
  r2Key: z.string().optional(),
  size: z.number(),
});

export const snapshotItemSchema = z.object({
  archiveR2Key: z.string().nullable().optional(),
  description: z.string(),
  directoryPath: z.string(),
  entryPath: z.string(),
  hash: z.string(),
  id: idSchema,
  isDeprecated: z.boolean(),
  name: z.string(),
  skillId: idSchema,
  sourceCommitDate: z.number().int().nonnegative().nullable().optional(),
  sourceCommitMessage: z.string().nullable().optional(),
  sourceCommitSha: z.string().nullable().optional(),
  sourceCommitUrl: z.string().nullable().optional(),
  syncTime: z.number().int().nonnegative(),
  version: z.string(),
});

export const snapshotFileSignedUrlSchema = z.object({
  contentType: z.string().optional(),
  etag: z.string().optional(),
  size: z.number(),
  url: z.string(),
});

export const snapshotTreeEntrySchema = z.object({
  path: z.string().min(1),
  type: z.literal("blob"),
});

export const snapshotUploadFileSchema = fileContentSchema;

export const snapshotHistoryCommitSchema = githubCommitSchema;

export const snapshotCreateHistoricalSnapshotsInputSchema = z.object({
  commits: z.array(githubCommitSchema).min(1),
  repoName: githubRepoSchema,
  repoOwner: githubOwnerSchema,
  skillIds: z.array(idSchema).min(1),
});
