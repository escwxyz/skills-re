import { githubOwnerSchema, githubRepoSchema } from "@skills-re/contract/common/slugs";

export interface SearchSkillRow {
  authorHandle: string;
  createdAt: number;
  description: string;
  downloadsAllTime: number;
  downloadsTrending: number;
  forkCount: number;
  id: string;
  isVerified: boolean;
  latestAuditScore?: number | null;
  latestSnapshotId?: string | null;
  latestSnapshotTotalBytes?: number | null;
  latestVersion: string | null;
  license: string | null;
  ownerAvatarUrl: string | null;
  primaryCategory: string | null;
  repoName: string;
  repoUrl: string | null;
  slug: string;
  stargazerCount: number;
  syncTime: number;
  title: string;
  updatedAt: number;
  viewsAllTime: number;
  tags?: string[];
}

const isValidGithubOwner = (value: string) => githubOwnerSchema.safeParse(value).success;

const isValidGithubRepo = (value: string) => githubRepoSchema.safeParse(value).success;

export const toSearchSkillItem = (row: SearchSkillRow) => ({
  author: isValidGithubOwner(row.authorHandle)
    ? {
        avatarUrl: row.ownerAvatarUrl ?? undefined,
        githubUrl: `https://github.com/${row.authorHandle}`,
        handle: row.authorHandle,
      }
    : undefined,
  authorHandle: isValidGithubOwner(row.authorHandle) ? row.authorHandle : undefined,
  createdAt: row.createdAt,
  description: row.description,
  downloadsAllTime: row.downloadsAllTime,
  downloadsTrending: row.downloadsTrending,
  forkCount: row.forkCount,
  id: row.id,
  isVerified: row.isVerified,
  latestAuditScore: row.latestAuditScore ?? undefined,
  latestSnapshotId: row.latestSnapshotId ?? undefined,
  latestSnapshotTotalBytes: row.latestSnapshotTotalBytes ?? undefined,
  latestVersion: row.latestVersion ?? undefined,
  license: row.license ?? undefined,
  primaryCategory: row.primaryCategory ?? undefined,
  repoName: isValidGithubRepo(row.repoName) ? row.repoName : undefined,
  repoUrl: row.repoUrl ?? undefined,
  slug: row.slug,
  stargazerCount: row.stargazerCount,
  syncTime: row.syncTime,
  title: row.title,
  updatedAt: row.updatedAt,
  viewsAllTime: row.viewsAllTime,
  tags: row.tags?.length ? row.tags : undefined,
});
