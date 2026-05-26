import { createServerFn } from "@tanstack/react-start";

import {
  fetchMineCollectionDetail,
  fetchMineCollections,
} from "@/functions/collections/collections.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export type DashboardCollectionsData = NonNullable<
  Awaited<ReturnType<typeof getDashboardCollections>>
>;

export const getDashboardCollections = createServerFn({ method: "GET" }).handler(async () => {
  const client = createServerORPCClient();
  const collections = await fetchMineCollections({ client });
  const defaultCollection = collections.find((collection) => collection.kind === "default") ?? null;
  const defaultDetail = defaultCollection
    ? await fetchMineCollectionDetail({ client, id: defaultCollection.id })
    : null;

  return {
    collections,
    defaultCollection: defaultDetail,
  };
});
