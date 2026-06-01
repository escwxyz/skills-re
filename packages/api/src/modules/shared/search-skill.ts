import { searchSkillListItemSchema } from "@skills-re/contract/common/content";
import { githubOwnerSchema, githubRepoSchema } from "@skills-re/contract/common/slugs";

export interface SearchSkillRow {
  authorHandle: string;
  createdAt: number | null;
  description: string;
  downloadsAllTime: number | null;
  downloadsTrending: number | null;
  forkCount: number | null;
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
  stargazerCount: number | null;
  syncTime: number | null;
  title: string;
  updatedAt: number | null;
  viewsAllTime: number | null;
  tags?: string[];
}

const isValidGithubOwner = (value: string) => githubOwnerSchema.safeParse(value).success;

const isValidGithubRepo = (value: string) => githubRepoSchema.safeParse(value).success;

const toOptionalNumber = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const toSearchSkillItem = (row: SearchSkillRow) => ({
  author: isValidGithubOwner(row.authorHandle)
    ? {
        avatarUrl: row.ownerAvatarUrl ?? undefined,
        githubUrl: `https://github.com/${row.authorHandle}`,
        handle: row.authorHandle,
      }
    : undefined,
  authorHandle: isValidGithubOwner(row.authorHandle) ? row.authorHandle : undefined,
  createdAt: toOptionalNumber(row.createdAt),
  description: row.description,
  downloadsAllTime: toOptionalNumber(row.downloadsAllTime),
  downloadsTrending: toOptionalNumber(row.downloadsTrending),
  forkCount: toOptionalNumber(row.forkCount),
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
  stargazerCount: toOptionalNumber(row.stargazerCount),
  syncTime: toOptionalNumber(row.syncTime),
  title: row.title,
  updatedAt: toOptionalNumber(row.updatedAt),
  viewsAllTime: toOptionalNumber(row.viewsAllTime),
  tags: row.tags?.length ? row.tags : undefined,
});

export const toValidSearchSkillItem = (row: SearchSkillRow) => {
  const item = toSearchSkillItem(row);
  const parsed = searchSkillListItemSchema.safeParse(item);
  return parsed.success ? parsed.data : null;
};
