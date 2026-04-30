import { z } from "zod";

import { idSchema } from "./ids";
import { categorySlugSchema } from "../categories-taxonomy";
import { githubOwnerSchema, githubRepoSchema, skillSlugSchema, tagSlugSchema } from "./slugs";

export const relatedTagSchema = z.object({
  count: z.number().int().nonnegative(),
  slug: tagSlugSchema,
});

export const relatedCategorySchema = z.object({
  count: z.number().int().nonnegative(),
  name: z.string(),
  slug: tagSlugSchema,
});

export const skillListItemSchema = z.object({
  description: z.string(),
  id: idSchema,
  slug: skillSlugSchema,
  syncTime: z.number().int().nonnegative(),
  title: z.string(),
});

export const skillBasicSchema = z.object({
  description: z.string(),
  title: z.string(),
});

export const skillPathSchema = z.object({
  authorHandle: githubOwnerSchema.optional(),
  repoName: githubRepoSchema.optional(),
  skillSlug: skillSlugSchema,
});

export const authorSchema = z.object({
  avatarUrl: z.string().nullable().optional(),
  githubUrl: z.string().url().optional(),
  handle: githubOwnerSchema,
  isVerified: z.boolean().optional(),
  name: z.string().nullable().optional(),
  repoCount: z.number().int().nonnegative().optional(),
  skillCount: z.number().int().nonnegative().optional(),
});

export const authorListItemSchema = authorSchema.extend({
  githubUrl: z.string().url(),
  repoCount: z.number().int().nonnegative(),
  skillCount: z.number().int().nonnegative(),
});

export const searchSkillListItemSchema = z.object({
  author: authorSchema.optional(),
  authorHandle: githubOwnerSchema.optional(),
  createdAt: z.number().int().nonnegative().optional(),
  description: z.string(),
  downloadsAllTime: z.number().int().nonnegative().optional(),
  downloadsTrending: z.number().int().nonnegative().optional(),
  forkCount: z.number().optional(),
  id: idSchema,
  isVerified: z.boolean().optional(),
  latestVersion: z.string().optional(),
  latestSnapshotTotalBytes: z.number().int().nonnegative().optional(),
  license: z.string().optional(),
  primaryCategory: z.string().optional(),
  repoName: githubRepoSchema.optional(),
  repoUrl: z.string().optional(),
  slug: skillSlugSchema,
  stargazerCount: z.number().optional(),
  staticAudit: z
    .object({
      isBlocked: z.boolean(),
      overallScore: z.number().int().min(0).max(100),
      riskLevel: z.enum(["safe", "low", "medium", "high", "critical"]),
      safeToPublish: z.boolean(),
      status: z.enum(["pass", "fail"]),
      summary: z.string(),
      syncTime: z.number().int().nonnegative(),
    })
    .optional(),
  syncTime: z.number().int().nonnegative().optional(),
  tags: z.array(tagSlugSchema).optional(),
  title: z.string(),
  updatedAt: z.number().int().nonnegative().optional(),
  viewsAllTime: z.number().int().nonnegative().optional(),
});

export const skillDetailSchema = searchSkillListItemSchema;

export const tagListItemSchema = z.object({
  count: z.number().int().nonnegative(),
  id: idSchema,
  slug: tagSlugSchema,
});

export const tagDetailSchema = z.object({
  count: z.number().int().nonnegative(),
  id: idSchema,
  indexable: z.boolean(),
  relatedCategories: z.array(relatedCategorySchema),
  relatedTags: z.array(relatedTagSchema),
  slug: tagSlugSchema,
  topSkills: z.array(searchSkillListItemSchema),
});

export const categoryListItemSchema = z.object({
  count: z.number().int().nonnegative(),
  id: idSchema,
  name: z.string(),
  slug: categorySlugSchema,
});

export const categoryDetailSchema = z.object({
  count: z.number().int().nonnegative(),
  id: idSchema,
  name: z.string(),
  relatedTags: z.array(relatedTagSchema),
  slug: categorySlugSchema,
  topSkills: z.array(searchSkillListItemSchema),
});

export const collectionListItemSchema = z.object({
  description: z.string(),
  id: idSchema,
  skillCount: z.number().int().nonnegative(),
  slug: tagSlugSchema,
  title: z.string(),
});

export const collectionDetailSchema = z.object({
  description: z.string(),
  id: idSchema,
  skills: z.array(searchSkillListItemSchema),
  slug: tagSlugSchema,
  title: z.string(),
});

export const repoListItemSchema = z.object({
  nameWithOwner: z.string(),
  repoName: githubRepoSchema,
  repoOwner: githubOwnerSchema,
});

export const repoDuplicateInputSchema = z.object({
  directoryPath: z.string().min(1).optional(),
  repoName: githubRepoSchema,
  repoOwner: githubOwnerSchema,
});

export const repoDuplicateResultSchema = z
  .object({
    duplicated: z.boolean(),
  })
  .passthrough();

export const repoStatsUpdateInputSchema = z.object({
  forks: z.number().int().nonnegative(),
  nameWithOwner: z.string().min(1),
  stars: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const repoStatsUpdateResultSchema = z.object({
  changed: z.boolean(),
});

export const repoStatsSyncInputSchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(20).optional(),
  })
  .optional();

export const repoStatsSyncResultSchema = z.union([
  z.null(),
  z.object({
    changed: z.array(
      z.object({
        repoName: z.string(),
        repoOwner: z.string(),
        updatedAt: z.number().int().nonnegative(),
      }),
    ),
    continueCursor: z.string(),
    isDone: z.boolean(),
  }),
]);
