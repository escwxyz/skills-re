import type { AppRouterClient } from "@skills-re/api";

interface TagsInitialClient {
  tags: Pick<AppRouterClient["tags"], "count" | "listPage">;
}

export const fetchTagsListInitial = async (input: { client: TagsInitialClient }) => {
  const [count, initialPage] = await Promise.all([
    input.client.tags.count(),
    input.client.tags.listPage({ limit: 24 }),
  ]);

  return {
    count,
    initialPage,
  };
};

interface TagsListPageClient {
  tags: Pick<AppRouterClient["tags"], "listPage">;
}

export const fetchTagsListPage = async (input: {
  client: TagsListPageClient;
  cursor?: string;
  limit?: number;
}) =>
  await input.client.tags.listPage({
    cursor: input.cursor,
    limit: input.limit,
  });

interface TagDetailClient {
  tags: Pick<AppRouterClient["tags"], "getBySlug">;
}

export const fetchTagDetail = async (input: { client: TagDetailClient; slug: string }) => {
  const tag = await input.client.tags.getBySlug({ slug: input.slug });

  if (!tag) {
    return null;
  }

  return {
    count: tag.count,
    indexable: tag.indexable,
    relatedCategories: tag.relatedCategories,
    relatedTags: tag.relatedTags,
    slug: tag.slug,
  };
};

interface TagTopSkillsClient {
  tags: Pick<AppRouterClient["tags"], "getBySlug">;
}

export const fetchTagTopSkills = async (input: { client: TagTopSkillsClient; slug: string }) => {
  const tag = await input.client.tags.getBySlug({ slug: input.slug });

  if (!tag) {
    return null;
  }

  return {
    count: tag.count,
    topSkills: tag.topSkills.map((skill) => ({
      id: skill.id,
      title: skill.title,
      description: skill.description,
      slug: skill.slug,
      authorHandle: skill.authorHandle,
      repoName: skill.repoName,
    })),
  };
};
