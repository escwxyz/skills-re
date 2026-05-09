import { createServerORPCClient } from "@/lib/orpc.server";
import type { CategoryListItem, DailyMetricPoint } from "@/utils/types";

export interface CategoriesListPageData {
  authorsCount: number;
  categories: CategoryListItem[];
  dailyMetrics: DailyMetricPoint[];
  skillsCount: number;
}

export const fetchCategoriesListPageData = async () => {
  const client = createServerORPCClient();

  const [categories, skillsCount, authors, dailyMetrics] = await Promise.all([
    client.categories.list({ all: true, limit: 100 }),
    client.skills.count(),
    client.skills.listAuthors(),
    client.metrics.dailySkillsSnapshots({ limit: 30 }),
  ]);

  return {
    authorsCount: authors.length,
    categories,
    dailyMetrics,
    skillsCount,
  };
};

export const fetchCategoryDetailPageData = async (slug: string) => {
  const client = createServerORPCClient();
  const categoryDetail = await client.categories.getBySlug({ slug });

  if (!categoryDetail) {
    return null;
  }

  return {
    count: categoryDetail.count,
    relatedTags: categoryDetail.relatedTags,
    slug,
  };
};
