import { createServerORPCClient } from "@/lib/orpc.server";
import type { CategoryListItem, DailyMetricPoint } from "@/utils/types";

export interface CategoriesListPageData {
  categories: CategoryListItem[];
  skillsCount: number;
}

export interface CategoriesStatsData {
  authorsCount: number;
  dailyMetrics: DailyMetricPoint[];
}

export const fetchCategoriesListPageData = async () => {
  const client = createServerORPCClient();

  const [categories, skillsCount] = await Promise.all([
    client.categories.list({ all: true, limit: 100 }),
    client.skills.count(),
  ]);

  return { categories, skillsCount };
};

export const fetchCategoriesStats = async () => {
  const client = createServerORPCClient();

  const [authors, dailyMetrics] = await Promise.all([
    client.skills.listAuthors(),
    client.metrics.dailySkillsSnapshots({ limit: 7 }),
  ]);

  return { authorsCount: authors.length, dailyMetrics };
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
