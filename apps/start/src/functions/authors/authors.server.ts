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
