import type { AppRouterClient } from "@skills-re/api";

interface AuthorsIntialClient {
  skills: Pick<AppRouterClient["skills"], "count" | "listAuthors" | "countAuthors">;
  metrics: Pick<AppRouterClient["metrics"], "dailySkillsSnapshots">;
}

export const fetchAuthorsInitial = async (input: { client: AuthorsIntialClient }) => {
  const { client } = input;
  const [topAuthors, skillsCount, authorsCount, dailyMetrics] = await Promise.all([
    client.skills.listAuthors({ limit: 3, sort: "popular" }),
    client.skills.count(),
    client.skills.countAuthors(),
    client.metrics.dailySkillsSnapshots({ limit: 7 }),
  ]);

  return {
    authorsCount: authorsCount.authorsCount,
    dailyMetrics,
    skillsCount,
    topAuthors: topAuthors.page,
    verifiedCount: authorsCount.verifiedCount,
  };
};

interface AuthorDetailClient {
  skills: Pick<AppRouterClient["skills"], "getAuthorByHandle">;
}

export const fetchAuthorDetail = async (input: { client: AuthorDetailClient; handle: string }) =>
  await input.client.skills.getAuthorByHandle({ handle: input.handle });

interface AuthorsPaginationClient {
  skills: Pick<AppRouterClient["skills"], "listAuthors">;
}

export const fetchAuthorsPagination = async (input: {
  client: AuthorsPaginationClient;
  cursor?: string;
  limit?: number;
  sort?: "alphabetical" | "popular";
}) =>
  await input.client.skills.listAuthors({
    cursor: input.cursor,
    limit: input.limit,
    sort: input.sort,
  });

interface AuthorSkillsPaginationClient {
  skills: Pick<AppRouterClient["skills"], "search">;
}

interface AuthorReposClient {
  repos: Pick<AppRouterClient["repos"], "listByOwner">;
}

export const fetchAuthorSkillsPagination = async (input: {
  client: AuthorSkillsPaginationClient;
  cursor?: string;
  handle: string;
  limit?: number;
  repoName?: string;
}) => {
  const result = await input.client.skills.search({
    authorHandle: input.handle,
    cursor: input.cursor,
    limit: input.limit ?? 5,
    repoName: input.repoName,
    sort: "downloads-all-time",
  });

  return {
    continueCursor: result.continueCursor,
    isDone: result.isDone,
    page: result.page,
  };
};

export const fetchAuthorRepos = async (input: {
  client: AuthorReposClient;
  cursor?: string;
  handle: string;
  limit?: number;
}) =>
  await input.client.repos.listByOwner({
    cursor: input.cursor,
    limit: input.limit ?? 100,
    ownerHandle: input.handle,
  });

export const fetchAuthorSkillsStats = async (input: {
  client: AuthorSkillsPaginationClient;
  handle: string;
}) => {
  const limit = 100;
  let cursor: string | undefined;
  let skillCount = 0;
  let totalDownloads = 0;
  let totalStars = 0;
  let totalAuditScore = 0;
  let done = false;

  while (!done) {
    const page = await input.client.skills.search({
      authorHandle: input.handle,
      cursor,
      limit,
      sort: "downloads-all-time",
    });

    for (const skill of page.page) {
      skillCount += 1;
      totalDownloads += skill.downloadsAllTime ?? 0;
      totalStars += skill.stargazerCount ?? 0;
      totalAuditScore += skill.staticAudit?.overallScore ?? 0;
    }

    if (page.isDone) {
      done = true;
      continue;
    }

    const nextCursor = page.continueCursor || undefined;
    if (!nextCursor || nextCursor === cursor) {
      done = true;
      continue;
    }

    cursor = nextCursor;
  }

  return {
    averageAuditScore: skillCount > 0 ? Math.round(totalAuditScore / skillCount) : null,
    skillCount,
    totalDownloads,
    totalStars,
  };
};
