import type { AppRouterClient } from "@skills-re/api";

interface CategoriesClient {
  categories: Pick<AppRouterClient["categories"], "list">;
  skills: Pick<AppRouterClient["skills"], "count">;
}

export const fetchCategories = async (input: { client: CategoriesClient }) => {
  const [categories, skillsCount] = await Promise.all([
    input.client.categories.list({ all: true, limit: 100 }),
    input.client.skills.count(),
  ]);

  return { categories, skillsCount };
};

interface CategoriesStatsClient {
  metrics: Pick<AppRouterClient["metrics"], "dailySkillsSnapshots">;
  skills: Pick<AppRouterClient["skills"], "countAuthors">;
}

export const fetchCategoriesStats = async (input: { client: CategoriesStatsClient }) => {
  const [authors, dailyMetrics] = await Promise.all([
    input.client.skills.countAuthors(),
    input.client.metrics.dailySkillsSnapshots({ limit: 7 }),
  ]);

  return { authorsCount: authors.authorsCount, dailyMetrics };
};

interface CategoryDetailClient {
  categories: Pick<AppRouterClient["categories"], "getBySlug">;
}

export const fetchCategoryDetailPageData = async (input: {
  client: CategoryDetailClient;
  slug: string;
}) => {
  const categoryDetail = await input.client.categories.getBySlug({ slug: input.slug });

  if (!categoryDetail) {
    return null;
  }

  return {
    count: categoryDetail.count,
    relatedTags: categoryDetail.relatedTags,
    slug: input.slug,
  };
};

interface CategoryTopSkillsClient {
  categories: Pick<AppRouterClient["categories"], "getTopSkillsBySlug">;
}

export const fetchCategoryTopSkills = async (input: {
  client: CategoryTopSkillsClient;
  slug: string;
}) => {
  const category = await input.client.categories.getTopSkillsBySlug({ slug: input.slug });

  if (!category) {
    return null;
  }

  return {
    count: category.count,
    topSkills: category.topSkills.map((skill) => ({
      id: skill.id,
      title: skill.title,
      description: skill.description,
      slug: skill.slug,
      authorHandle: skill.authorHandle,
      repoName: skill.repoName,
    })),
  };
};
