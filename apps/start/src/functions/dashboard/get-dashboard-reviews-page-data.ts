import { createServerFn } from "@tanstack/react-start";

import { createServerORPCClient } from "@/lib/orpc.server";

export const getDashboardReviewsPageData = createServerFn({ method: "GET" }).handler(async () => {
  const client = createServerORPCClient();
  const [reviews, reviewCount] = await Promise.all([
    client.reviews.listMine({ limit: 100 }),
    client.reviews.countMine({}),
  ]);

  return { reviewCount, reviews };
});

export type DashboardReviewsPageData = NonNullable<
  Awaited<ReturnType<typeof getDashboardReviewsPageData>>
>;
