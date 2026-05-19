import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { LoadMore } from "@/components/load-more";
import { ReviewCard } from "@/components/review-card";
import { ReviewRatingSidebar } from "@/components/review-rating-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { buildSkillOgImagePath } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getSkillReviewsInitial } from "@/functions/skills/get-skill-reviews-initial";
import { getSkillReviewsPagination } from "@/functions/skills/get-skill-reviews-pagination";

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug/reviews")({
  loader: ({ params }) => getSkillReviewsInitial({ data: { skillSlug: params.slug } }),
  validateSearch: searchSchema,
  head: ({ loaderData, params }) =>
    createSeo({
      canonicalPath: `/skills/${params.author}/${params.repo}/${params.slug}/reviews`,
      description: loaderData?.skillDescription,
      image:
        buildSkillOgImagePath({
          authorHandle: params.author,
          repoName: params.repo,
          skillSlug: params.slug,
        }) ?? undefined,
      title: loaderData?.skillTitle
        ? `${m.skill_detail_review_tab()} · ${loaderData.skillTitle}`
        : undefined,
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const loaderData = Route.useLoaderData();
  if (!loaderData) {
    throw notFound();
  }

  const { slug } = Route.useParams();
  const getPage = useServerFn(getSkillReviewsPagination);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["skillReviews", slug],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      getPage({ data: { cursor: pageParam ?? undefined, skillSlug: slug } }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
    initialData: {
      pages: [{ nextCursor: loaderData.nextCursor, reviews: loaderData.reviews }],
      pageParams: [null],
    },
  });

  const allReviews = data.pages.flatMap((page) => page.reviews);

  return (
    <div className="grid min-h-150 grid-cols-1 md:grid-cols-[280px_1fr]">
      <ReviewRatingSidebar
        ratingAvg={loaderData.ratingAvg}
        totalReviews={loaderData.totalReviews}
        recommendPct={loaderData.recommendPct}
        ratingCounts={loaderData.ratingCounts}
        skillId={loaderData.skillId}
      />

      <div>
        {allReviews.length > 0 ? (
          <>
            {allReviews.map((review, index) => (
              <ReviewCard
                key={review.id}
                authorName={review.authorName}
                body={review.body}
                createdAt={review.createdAt}
                isLast={!hasNextPage && index === allReviews.length - 1}
                stars={review.stars}
                title={review.title}
                versionLabel={review.versionLabel}
              />
            ))}
            {isFetchingNextPage && <ReviewListSkeleton />}
            <LoadMore
              fetchNextPage={fetchNextPage}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
          </>
        ) : (
          <div className="px-4 py-8 md:px-7 md:py-10">
            <div className="border-border bg-muted border px-5 py-6">
              <div className="font-mono text-xs uppercase text-muted-foreground mb-2">
                {m.reviews_page_section_header()}
              </div>
              <p className="text-muted-foreground m-0 max-w-110">{m.reviews_page_empty()}</p>
            </div>
          </div>
        )}

        <div className="border-border font-mono text-xs uppercase text-muted-foreground flex items-center justify-between border-t px-4 py-5 md:px-7 md:py-6">
          <span>{m.reviews_page_showing({ count: loaderData.totalReviews })}</span>
          <span>{m.reviews_page_latest_feedback()}</span>
        </div>
      </div>
    </div>
  );
}

const ReviewListSkeleton = () => (
  <>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="border-border border-b px-4 py-6 md:px-7 md:py-8">
        <div className="mb-3 flex flex-col gap-0.5 md:flex-row md:items-baseline md:justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="mb-3 h-6 w-64" />
        <Skeleton className="mb-1 h-4 w-full max-w-180" />
        <Skeleton className="h-4 w-3/4 max-w-180" />
      </div>
    ))}
  </>
);
