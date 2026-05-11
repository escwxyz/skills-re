import { createServerORPCClient } from "@/lib/orpc.server";

export const fetchTagDetail = async (slug: string) => {
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
  };
};
