import { WriteReviewCta } from "@/components/write-review-cta";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export interface ReviewRatingCount {
  count: number;
  stars: number;
}

export interface ReviewRatingSidebarProps {
  mentionedTags?: string[];
  ratingAvg: number;
  ratingCounts: ReviewRatingCount[];
  recommendPct: number;
  skillId: string;
  totalReviews: number;
}

export const ReviewRatingSidebar = ({
  mentionedTags,
  ratingAvg,
  ratingCounts,
  recommendPct,
  skillId,
  totalReviews,
}: ReviewRatingSidebarProps) => (
  <aside className="border-border border-b px-5 py-6 md:border-r md:border-b-0 md:px-7 md:py-8">
    <div className="flex items-end justify-between gap-4 md:block">
      <div>
        <div className="font-display text-[72px] leading-[.85] tracking-[-0.03em] md:text-[96px]">
          {ratingAvg}
          <span className="text-[22px] text-muted-foreground md:text-[32px]">/5</span>
        </div>
        <div className="eyebrow mt-1.5 md:mt-2.5">
          {m.reviews_sidebar_rating_summary({
            count: totalReviews.toLocaleString(getLocale()),
            recommendPct,
          })}
        </div>
      </div>

      <div className="shrink-0 md:hidden">
        <WriteReviewCta skillId={skillId} />
      </div>
    </div>

    <div className="mt-6 hidden flex-col gap-1.5 md:flex">
      {ratingCounts.map(({ stars, count }) => {
        const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
        return (
          <div
            key={stars}
            className="grid grid-cols-[12px_1fr_32px] items-center gap-2 font-mono text-[11px]"
          >
            <span className="text-muted-foreground">{stars}</span>
            <div className="h-1 bg-rule">
              <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-right text-muted-foreground">{count}</span>
          </div>
        );
      })}
    </div>

    {mentionedTags && mentionedTags.length > 0 && (
      <div className="mt-7 hidden border-t border-border pt-6 md:block">
        <div className="eyebrow text-editorial-red mb-3">{m.reviews_sidebar_mentioned_tags()}</div>
        <div className="flex flex-wrap gap-1.5">
          {mentionedTags.map((tag) => (
            <span
              key={tag}
              className="border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    )}

    <div className="mt-8 hidden md:block">
      <WriteReviewCta skillId={skillId} />
    </div>
  </aside>
);
