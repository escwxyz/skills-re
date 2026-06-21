import type { PagefindExportInput, PagefindExportPage } from "@skills-re/contract/pagefind";

import { listPagefindExportRows } from "./repo";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export interface PagefindIndexServiceDeps {
  listPagefindExportRows: typeof listPagefindExportRows;
}

export const createPagefindIndexService = (overrides: Partial<PagefindIndexServiceDeps> = {}) => {
  const deps: PagefindIndexServiceDeps = {
    listPagefindExportRows,
    ...overrides,
  };

  return {
    async exportPage(
      input: PagefindExportInput,
      serverOrigin: string,
    ): Promise<PagefindExportPage> {
      const result = await deps.listPagefindExportRows(input);
      const { origin } = new URL(serverOrigin);
      const page = result.page
        .filter((row) => SHA256_PATTERN.test(row.fileHash.toLowerCase()))
        .map((row) => ({
          artifactDigest: `sha256:${row.fileHash.toLowerCase()}` as const,
          artifactUrl: `${origin}/.well-known/agent-skills/${encodeURIComponent(row.snapshotId)}/SKILL.md`,
          authorHandle: row.authorHandle,
          canonicalUrl: `/skills/${encodeURIComponent(row.authorHandle)}/${encodeURIComponent(row.repoName)}/${encodeURIComponent(row.slug)}`,
          description: row.description,
          isVerified: row.isVerified,
          primaryCategory: row.primaryCategory,
          repoName: row.repoName,
          skillId: row.id,
          skillSlug: row.slug,
          snapshotId: row.snapshotId,
          tags: row.tags.toSorted(),
          title: row.title,
          updatedAt: row.updatedAt,
        }));

      return {
        continueCursor: result.continueCursor,
        isDone: result.isDone,
        page,
        sourceWatermark: result.sourceWatermark,
      };
    },
  };
};

export const pagefindIndexService = createPagefindIndexService();
