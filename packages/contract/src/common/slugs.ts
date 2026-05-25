import { z } from "zod";

export const githubOwnerSchema = z
  .string()
  .regex(/^(?!-)(?!.*--)(?!.*-$)[A-Za-z0-9-]{1,39}$/, "Invalid GitHub owner handle.");

export const githubRepoSchema = z
  .string()
  .regex(/^[A-Za-z0-9._-]{1,100}$/, "Invalid GitHub repository name.");

export const tagSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid tag slug");

export const skillSlugSchema = z.string().regex(/^[a-z0-9-]+$/, "Invalid skill slug");

const MAX_SKILL_SLUG_LENGTH = 64;
const TRAILING_COMBINING_MARKS = /[\u0300-\u036F]/g;
const INVALID_SKILL_SLUG_CHARS = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-+|-+$/g;
const REPEATED_HYPHENS = /-+/g;

export const normalizeSkillSlug = (value: string) => {
  const normalized = value
    .normalize("NFKD")
    .replace(TRAILING_COMBINING_MARKS, "")
    .trim()
    .toLowerCase()
    .replace(INVALID_SKILL_SLUG_CHARS, "-")
    .replace(REPEATED_HYPHENS, "-")
    .replace(EDGE_HYPHENS, "");

  const truncated = normalized.slice(0, MAX_SKILL_SLUG_LENGTH).replace(EDGE_HYPHENS, "");
  return truncated || "skill";
};

export const skillSlugInputSchema = z.object({
  slug: z.string(),
});

export const authorHandleInputSchema = z.object({
  handle: z.string(),
});
