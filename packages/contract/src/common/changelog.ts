import { z } from "zod";

export const changelogTypeSchema = z.enum(["feature", "patch", "major"]);

export const changelogSchema = z.object({
  changes: z.array(z.string()),
  createdAt: z.number().int().nonnegative(),
  description: z.string(),
  id: z.string(),
  isPublished: z.boolean(),
  isStable: z.boolean(),
  title: z.string(),
  type: changelogTypeSchema,
  versionMajor: z.number().int().nonnegative(),
  versionMinor: z.number().int().nonnegative(),
  versionPatch: z.number().int().nonnegative(),
});

export const listChangelogsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
});
