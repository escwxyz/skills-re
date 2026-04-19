import { z } from "zod";

export const githubOwnerSchema = z
  .string()
  .regex(/^(?!-)(?!.*--)(?!.*-$)[A-Za-z0-9-]{1,39}$/, "Invalid GitHub owner handle.");

export const githubRepoSchema = z
  .string()
  .regex(/^[A-Za-z0-9._-]{1,100}$/, "Invalid GitHub repository name.");

export const tagSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid tag slug");

export const skillSlugSchema = z.string().regex(/^[a-z0-9-]+$/, "Invalid skill slug");

export const skillSlugInputSchema = z.object({
  slug: z.string(),
});

export const authorHandleInputSchema = z.object({
  handle: z.string(),
});
