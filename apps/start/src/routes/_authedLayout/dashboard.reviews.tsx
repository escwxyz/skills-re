// oxlint-disable no-nested-ternary
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { ChatCircleTextIcon, CheckIcon, StarIcon } from "@phosphor-icons/react";

import { TimeValue } from "@/components/time-value";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale, localizeHref } from "@/paraglide/runtime";
import { getDashboardReviewsPageData } from "@/functions/dashboard/get-dashboard-reviews-page-data";
import type { DashboardReviewsPageData } from "@/functions/dashboard/get-dashboard-reviews-page-data";

export const Route = createFileRoute("/_authedLayout/dashboard/reviews")({
  loader: () => getDashboardReviewsPageData(),
  ssr: "data-only",
  head: () =>
    createSeo({
      canonicalPath: "/dashboard/reviews",
      locale: getLocale(),
      noIndex: true,
      title: "Reviews",
    }),
  component: ReviewsRoute,
});

type ReviewItem = DashboardReviewsPageData["reviews"][number];

function ReviewRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-rule bg-paper px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
      <StarIcon className="size-3" />
      {rating.toFixed(1)}
    </span>
  );
}

function ReviewCard({ review }: { review: ReviewItem }) {
  const locale = getLocale();
  const skillHref = localizeHref(`/skills/${review.skillSlug}`);

  return (
    <Card className="rounded-none border-rule/70 bg-background">
      <CardHeader className="border-b border-rule/60 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
                <TimeValue locale={locale} time={review.createdAt} />
              </CardDescription>
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
                {review.skillSlug}
              </span>
            </div>
            <CardTitle className="font-display text-[1.35rem] leading-none tracking-[-0.03em]">
              {review.title ?? review.skillTitle}
            </CardTitle>
            <a
              className="inline-flex w-fit text-[13px] leading-none text-muted-text transition-colors hover:text-foreground"
              href={skillHref}
            >
              {review.skillTitle}
            </a>
          </div>
          <ReviewRating rating={review.rating} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 py-3">
        <p className="text-[13px] leading-[1.6] text-foreground/80">{review.content}</p>
        <Separator />
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 border border-rule/70 bg-paper/70 px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-text">
            <CheckIcon className="size-3" />
            {m.dashboard_reviews_read_only()}
          </span>
          <span className="inline-flex items-center gap-2 border border-rule/70 bg-paper/70 px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-text">
            <ChatCircleTextIcon className="size-3" />
            {m.dashboard_reviews_history_item()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewsRoute() {
  const data = Route.useLoaderData();
  const { currentUser } = useRouteContext({ from: "/_authedLayout/dashboard" });

  if (!data || !currentUser) {
    return null;
  }

  const displayHandle =
    (currentUser as { github?: string | null } | null)?.github ??
    currentUser?.email?.split("@")[0] ??
    currentUser?.id ??
    "dashboard";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="border bg-paper p-6 shadow-[0_10px_40px_rgba(20,18,14,0.05)]">
        <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-muted-text">
          {m.dashboard_reviews_eyebrow()}
        </div>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,4rem)] leading-[0.92] tracking-[-0.04em]">
          {m.dashboard_reviews_title()}
        </h1>
        <p className="mt-4 max-w-2xl text-[13px] leading-[1.65] text-muted-text">
          {m.dashboard_reviews_description({ handle: displayHandle })}
        </p>
      </section>

      <div className="space-y-3">
        {data.reviews.length > 0 ? (
          data.reviews.map((review) => <ReviewCard key={review.id} review={review} />)
        ) : (
          <div className="border border-dashed border-rule bg-background px-5 py-12 text-center">
            <ChatCircleTextIcon className="mx-auto size-8 text-muted-text/60" />
            <p className="mt-4 font-display text-[1.35rem] leading-none tracking-[-0.03em] text-foreground">
              {m.dashboard_reviews_empty_title()}
            </p>
            <p className="mx-auto mt-3 max-w-lg text-[13px] leading-[1.6] text-muted-text">
              {m.dashboard_reviews_empty_description()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
