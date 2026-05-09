import { createServerORPCClient } from "@/lib/orpc.server";
import type { BrowseSkillItem, CategoryListItem } from "@/utils/types";

export interface HomePageData {
  categories: CategoryListItem[];
  featuredPicks: BrowseSkillItem[];
}

export const fetchHomePageData = async (): Promise<HomePageData> => {
  const client = createServerORPCClient();

  const [categories, featuredSkills] = await Promise.all([
    client.categories.list({ all: true, limit: 8 }),
    client.skills.search({
      limit: 5,
      sort: "downloads-all-time",
    }),
  ]);

  return { categories, featuredPicks: featuredSkills.page };
};
