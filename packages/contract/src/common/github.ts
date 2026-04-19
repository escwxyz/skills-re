import { z } from "zod";

import { tagSlugSchema } from "./slugs";

export const githubOwnerRegex = /^(?!-)(?!.*--)(?!.*-$)[A-Za-z0-9-]{1,39}$/;
export const githubRepoRegex = /^[A-Za-z0-9._-]{1,100}$/;

export const githubOwnerSchema = z
  .string()
  .regex(githubOwnerRegex, "Invalid GitHub owner handle.");
export const githubRepoSchema = z
  .string()
  .regex(githubRepoRegex, "Invalid GitHub repository name.");
export const githubUrlSchema = z.string().url().startsWith("https://github.com");

export const repoOwnerSchema = githubOwnerSchema;
export const repoNameSchema = githubRepoSchema;

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

export const githubCommitSchema = z.object({
  committedDate: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  sha: z.string(),
  url: z.string().nullable().optional(),
});

export const licenseInfoSchema = z.object({
  name: z.string(),
});

export const healthStatusSchema = z.object({
  status: z.enum(["ok"]),
  timestamp: z.number(),
});

export const requestContextSchema = z.object({
  city: z.string().nullable().optional(),
  clarityProjectId: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  ip: z.string().nullable().optional(),
  rayId: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

export const githubInvalidSkillPreviewSchema = z.object({
  message: z.string(),
  skillMdPath: z.string(),
  skillRootPath: z.string(),
});

export const githubSkillPreviewSchema = z.object({
  files: z.array(fileContentSchema),
  frontmatter: z.record(z.string(), z.unknown()),
  skillDescription: z.string(),
  skillMdContent: z.string(),
  skillMdPath: z.string(),
  skillRootPath: z.string(),
  skillTitle: z.string(),
});

export const fetchGithubRepoInputSchema = z.object({
  githubUrl: githubUrlSchema,
});

export const fetchGithubRepoOutputSchema = z.object({
  branch: z.string(),
  commitDate: z.string().nullable(),
  commitMessage: z.string().nullable(),
  commitSha: z.string(),
  forkCount: z.number().nullable(),
  licenseInfo: licenseInfoSchema.nullable(),
  nameWithOwner: z.string().nullable(),
  owner: z.string(),
  ownerAvatarUrl: z.string().nullable(),
  ownerHandle: z.string(),
  ownerName: z.string().nullable(),
  recentCommits: z.array(githubCommitSchema),
  repo: z.string(),
  repoCreatedAt: z.string().nullable(),
  repoUpdatedAt: z.string().nullable(),
  repoUrl: z.string().nullable(),
  requestedSkillPath: z.string().nullable(),
  invalidSkills: z.array(githubInvalidSkillPreviewSchema),
  skills: z.array(githubSkillPreviewSchema),
  stargazerCount: z.number().nullable(),
  tree: z.array(treeEntrySchema),
});

export const uploadRepoInputSchema = z.object({
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
});

export const uploadSkillInputSchema = z.object({
  description: z.string(),
  directoryPath: z.string(),
  entryPath: z.string(),
  initialSnapshot: z.object({
    files: z.array(fileContentSchema),
    sourceCommitDate: z.number(),
    sourceCommitMessage: z.string().optional(),
    sourceCommitSha: z.string(),
    sourceCommitUrl: z.string().optional(),
    sourceRef: z.string(),
    tree: z.array(treeEntrySchema),
  }),
  license: z.string().optional(),
  preferredVersion: z.string().min(1).optional(),
  slug: z.string(),
  sourceLocator: z.string(),
  sourceType: z.enum(["github", "upload"]),
  frontmatterHash: z.string().optional(),
  skillContentHash: z.string().optional(),
  tags: z.array(tagSlugSchema).optional(),
  title: z.string(),
});

export const submitGithubPreparedOutputSchema = z.object({
  recentCommits: z.array(githubCommitSchema),
  repo: uploadRepoInputSchema,
  skills: z.array(uploadSkillInputSchema).min(1),
});
