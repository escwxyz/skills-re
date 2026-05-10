"use client";

import { useEffect, useState } from "react";

import { StarIcon } from "@phosphor-icons/react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { formatDate } from "@/utils/format";
import { getLocale } from "@/paraglide/runtime";
import { renderMarkdownAsync } from "@/lib/markdown";

export interface ReviewCardProps {
  authorName: string;
  body: string;
  createdAt: number;
  isLast?: boolean;
  stars: number;
  title?: string;
  versionLabel?: string;
  tags?: string[];
}

export const ReviewCard = ({
  authorName,
  body,
  isLast,
  createdAt,
  stars,
  tags = [],
  title,
  versionLabel,
}: ReviewCardProps) => {
  const locale = getLocale();
  const [bodyHtml, setBodyHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // oxlint-disable-next-line promise/prefer-await-to-then
    renderMarkdownAsync(body).then((html) => {
      if (!cancelled) {
        setBodyHtml(html);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [body]);

  return (
    <article className={cn("px-4 py-6 md:px-7 md:py-8", !isLast && "border-b border-border")}>
      <div className="mb-3 flex flex-col gap-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:flex-row md:items-baseline md:justify-between md:text-[11px]">
        <div>
          <b className="font-semibold text-ink">{authorName}</b>
        </div>
        <div className="text-muted-foreground md:text-muted-foreground">
          {formatDate(createdAt, locale)}
          {versionLabel ? ` · ${versionLabel}` : ""}
        </div>
      </div>

      <div className="mb-2 text-[16px] tracking-widest md:text-[18px]">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className={index < stars ? "text-ink" : "text-rule"}>
            <StarIcon weight="fill" />
          </span>
        ))}
      </div>

      {title && (
        <h3 className="mb-3 font-display text-[20px] italic leading-[1.15] tracking-[-0.01em] md:text-[26px]">
          "{title}"
        </h3>
      )}

      {bodyHtml === null ? (
        <div className="mb-4 space-y-2">
          <Skeleton className="h-4 w-full max-w-180" />
          <Skeleton className="h-4 w-5/6 max-w-180" />
          <Skeleton className="h-4 w-4/6 max-w-180" />
        </div>
      ) : (
        <div
          className="mb-4 max-w-180 font-serif text-[14px] leading-[1.6] text-ink-2 md:text-[16px]"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.12em] text-ink-2"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
};
