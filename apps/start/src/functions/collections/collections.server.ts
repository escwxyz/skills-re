import type { AppRouterClient } from "@skills-re/api";

export const COLLECTIONS_PAGE_SIZE = 9;

interface CollectionsListClient {
  collections: Pick<AppRouterClient["collections"], "list">;
}

interface CollectionDetailClient {
  collections: Pick<AppRouterClient["collections"], "getBySlug">;
}

export const fetchCollectionsListPage = async (input: {
  client: CollectionsListClient;
  cursor?: string;
  limit?: number;
}) =>
  await input.client.collections.list({
    cursor: input.cursor,
    limit: input.limit ?? COLLECTIONS_PAGE_SIZE,
  });

export const fetchCollectionDetail = async (input: {
  client: CollectionDetailClient;
  slug: string;
}) => await input.client.collections.getBySlug({ slug: input.slug });

export type CollectionsListPage = Awaited<ReturnType<typeof fetchCollectionsListPage>>;
