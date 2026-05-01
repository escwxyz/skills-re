"use client";

import { CheckIcon, ChatCircleTextIcon, StarIcon, WarningCircleIcon } from "@phosphor-icons/react";

import { m } from "@/paraglide/messages";
import { getLocale, localizeHref } from "@/paraglide/runtime";
import { formatDateTime } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type { CurrentUser, ReviewItem } from "./shared";
import { DashboardSection } from "./shared";

interface Props {
  currentUser?: CurrentUser | null;
  isLoading?: boolean;
  reviews: ReviewItem[];
  reviewsError?: string | null;
}

function ReviewRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-rule bg-paper px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
      <StarIcon className="size-3" />
      {rating.toFixed(1)}
    </span>
  );
}

function ReviewCard({ locale, review }: { locale?: string; review: ReviewItem }) {
  const skillHref = localizeHref(`/skills/${review.skillSlug}`);

  return (
    <Card className="rounded-none border-rule/70 bg-background">
      <CardHeader className="border-b border-rule/60 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
                {formatDateTime(review.createdAt, locale)}
              </CardDescription>
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
                {review.skillSlug}
              </span>
            </div>
            <CardTitle className="font-serif text-[1.35rem] leading-none tracking-[-0.03em]">
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
          <span className="inline-flex items-center gap-2 border border-rule/70 bg-[#f6f0e5] px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-text">
            <CheckIcon className="size-3" />
            {m.dashboard_reviews_read_only()}
          </span>
          <span className="inline-flex items-center gap-2 border border-rule/70 bg-[#f6f0e5] px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-text">
            <ChatCircleTextIcon className="size-3" />
            {m.dashboard_reviews_history_item()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardReviews({ currentUser, isLoading, reviews, reviewsError }: Props) {
  let runtimeLocale: string | undefined = getLocale();

  if (!runtimeLocale && typeof navigator !== "undefined") {
    runtimeLocale = navigator.language;
  }

  const displayHandle =
    currentUser?.github ?? currentUser?.email?.split("@")[0] ?? currentUser?.id ?? "dashboard";
  let body = (
    <div className="border border-dashed border-rule bg-background px-5 py-10 text-center">
      <ChatCircleTextIcon className="mx-auto size-8 text-muted-text" />
      <p className="mt-4 font-serif text-[1.4rem] leading-none tracking-[-0.03em] text-foreground">
        {m.dashboard_reviews_empty_title()}
      </p>
      <p className="mx-auto mt-3 max-w-lg text-[13px] leading-[1.6] text-muted-text">
        {m.dashboard_reviews_empty_description()}
      </p>
    </div>
  );

  if (isLoading) {
    body = (
      <div className="border border-dashed border-rule bg-background px-5 py-10 text-center">
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
          {m.dashboard_reviews_loading()}
        </p>
      </div>
    );
  } else if (reviewsError) {
    body = (
      <div className="border border-dashed border-destructive/40 bg-background px-5 py-10 text-center">
        <WarningCircleIcon className="mx-auto size-8 text-destructive" />
        <p className="mt-4 font-serif text-[1.4rem] leading-none tracking-[-0.03em] text-foreground">
          {m.dashboard_reviews_failed()}
        </p>
        <p className="mx-auto mt-3 max-w-lg text-[13px] leading-[1.6] text-muted-text">
          {m.dashboard_reviews_failed_description()}
        </p>
      </div>
    );
  } else if (reviews.length > 0) {
    body = (
      <>
        {reviews.map((review) => (
          <ReviewCard key={review.id} locale={runtimeLocale} review={review} />
        ))}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <DashboardSection
        eyebrow={m.dashboard_reviews_eyebrow()}
        title={m.dashboard_reviews_title()}
        description={m.dashboard_reviews_description({ handle: displayHandle })}
      >
        <div className="space-y-3">{body}</div>
      </DashboardSection>
    </div>
  );
}
