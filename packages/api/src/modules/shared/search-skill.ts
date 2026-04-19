export interface SearchSkillRow {
  authorHandle: string;
  createdAt: number;
  description: string;
  downloadsAllTime: number;
  downloadsTrending: number;
  forkCount: number;
  id: string;
  isVerified: boolean;
  latestVersion: string | null;
  license: string | null;
  primaryCategory: string | null;
  repoName: string;
  repoUrl: string | null;
  slug: string;
  stargazerCount: number;
  syncTime: number;
  title: string;
  updatedAt: number;
  viewsAllTime: number;
}

export const toSearchSkillItem = (row: SearchSkillRow) => ({
  author: {
    githubUrl: `https://github.com/${row.authorHandle}`,
    handle: row.authorHandle,
  },
  authorHandle: row.authorHandle,
  createdAt: row.createdAt,
  description: row.description,
  downloadsAllTime: row.downloadsAllTime,
  downloadsTrending: row.downloadsTrending,
  forkCount: row.forkCount,
  id: row.id,
  isVerified: row.isVerified,
  latestVersion: row.latestVersion ?? undefined,
  license: row.license ?? undefined,
  primaryCategory: row.primaryCategory ?? undefined,
  repoName: row.repoName,
  repoUrl: row.repoUrl ?? undefined,
  slug: row.slug,
  stargazerCount: row.stargazerCount,
  syncTime: row.syncTime,
  title: row.title,
  updatedAt: row.updatedAt,
  viewsAllTime: row.viewsAllTime,
});
