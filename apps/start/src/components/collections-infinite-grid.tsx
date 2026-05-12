"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { CollectionsGrid } from "@/components/collections-grid";
import { LoadMore } from "@/components/load-more";
import { getCollectionsPagination } from "@/functions/collections/get-collections-pagination";
import type { CollectionsListPage } from "@/functions/collections/collections.server";

interface Props {
  initialPage: CollectionsListPage;
}

export const CollectionsInfiniteGrid = ({ initialPage }: Props) => {
  const getPage = useServerFn(getCollectionsPagination);

  const query = useInfiniteQuery<CollectionsListPage, Error>({
    getNextPageParam: (lastPage) =>
      lastPage.isDone ? undefined : lastPage.continueCursor || undefined,
    initialData: {
      pages: [initialPage],
      pageParams: [undefined],
    },
    initialPageParam: undefined,
    staleTime: 5 * 60 * 1000,
    queryFn: ({ pageParam }) =>
      typeof pageParam === "string"
        ? getPage({ data: { cursor: pageParam } })
        : getPage({ data: {} }),
    queryKey: ["collectionsIndex"],
  });

  const pages = query.data?.pages ?? [initialPage];
  const collections = pages.flatMap((page) => page.page);

  return (
    <>
      <CollectionsGrid collections={collections} />
      <LoadMore
        fetchNextPage={() => query.fetchNextPage()}
        hasNextPage={Boolean(query.hasNextPage)}
        isFetchingNextPage={query.isFetchingNextPage}
      />
    </>
  );
};
