import { createServerORPCClient } from "@/lib/orpc.server";
import type { BrowseSkillItem, TagListItem } from "@/utils/types";

export const TAGS_LIST_PAGE_SIZE = 24;

export interface TagsListPageData {
  count: number;
  initialPage: {
    items: TagListItem[];
    nextCursor: string | null;
    totalCount?: number;
  };
}

export interface TagDetailPageData {
  count: number;
  indexable: boolean;
  relatedCategories: { count: number; slug: string; name: string }[];
  relatedTags: { count: number; slug: string }[];
  slug: string;
  topSkills: BrowseSkillItem[];
}

export const fetchTagsListPageData = async () => {
  const client = createServerORPCClient();

  const page = await client.tags.listPage({ limit: TAGS_LIST_PAGE_SIZE });

  return {
    count: page.totalCount ?? 0,
    initialPage: page,
  };
};

export const fetchTagDetailPageData = async (slug: string) => {
  const client = createServerORPCClient();
  const tag = await client.tags.getBySlug({ slug });

  if (!tag) {
    return null;
  }

  return {
    count: tag.count,
    indexable: tag.indexable,
    relatedCategories: tag.relatedCategories,
    relatedTags: tag.relatedTags,
    slug: tag.slug,
    topSkills: tag.topSkills,
  };
};
