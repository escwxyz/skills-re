import type { AppRouterClient } from "@skills-re/api";

export const COLLECTIONS_PAGE_SIZE = 9;

interface CollectionsListClient {
  collections: Pick<AppRouterClient["collections"], "list">;
}

interface CollectionDetailClient {
  collections: Pick<AppRouterClient["collections"], "getBySlug">;
}

interface MineCollectionsClient {
  collections: Pick<AppRouterClient["collections"], "getMineById" | "listMine" | "saveSkill">;
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

export const fetchMineCollections = async (input: { client: MineCollectionsClient }) =>
  await input.client.collections.listMine();

export const fetchMineCollectionDetail = async (input: {
  client: MineCollectionsClient;
  id: string;
}) => await input.client.collections.getMineById({ id: input.id });

export const saveSkillToCollectionTarget = async (input: {
  client: MineCollectionsClient;
  collectionId?: string;
  newCollection?: {
    description?: string;
    slug?: string;
    title: string;
    visibility?: "public" | "private";
  };
  skillSlug: string;
  visibility?: "public" | "private";
}) =>
  await input.client.collections.saveSkill({
    collectionId: input.collectionId,
    newCollection: input.newCollection,
    skillSlug: input.skillSlug,
    visibility: input.visibility,
  });

export type CollectionsListPage = Awaited<ReturnType<typeof fetchCollectionsListPage>>;
export type MineCollectionsList = Awaited<ReturnType<typeof fetchMineCollections>>;
