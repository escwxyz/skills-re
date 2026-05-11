"use client";

import { Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Locale } from "@/paraglide/runtime";

import { cn } from "@/lib/utils";
import { formatInteger } from "@/utils/format";
import { getAuthorDisplayName, getAvatarLabel } from "@/utils/author-shared";
import type { fetchAuthorsPagination } from "@/functions/authors/authors.server";
import { getAuthorsPagination } from "@/functions/authors/get-authors-pagination";

const AUTHORS_PAGE_SIZE = 24;

export const AuthorsDirectory = ({
  alphabeticalTitle,
  locale,
  loadMoreLabel,
  loadingMoreLabel,
  publicAuthorSmallLabel,
  verifiedSmallLabel,
  reposLabel,
  skillsLabel,
}: {
  alphabeticalTitle: string;
  locale: Locale;
  loadMoreLabel: string;
  loadingMoreLabel: string;
  publicAuthorSmallLabel: string;
  verifiedSmallLabel: string;
  reposLabel: string;
  skillsLabel: string;
}) => {
  const getPage = useServerFn(getAuthorsPagination);
  const query = useInfiniteQuery<Awaited<ReturnType<typeof fetchAuthorsPagination>>, Error>({
    getNextPageParam: (lastPage) =>
      lastPage.isDone ? undefined : lastPage.continueCursor || undefined,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      getPage({
        data: {
          cursor: typeof pageParam === "string" ? pageParam : undefined,
          limit: AUTHORS_PAGE_SIZE,
          sort: "alphabetical",
        },
      }),
    queryKey: ["authorsDirectory"],
  });

  const pages = query.data?.pages ?? [];
  const authors = pages.flatMap((page) => page.page);
  const hasNextPage = Boolean(query.hasNextPage);
  const isLoading = query.isPending && authors.length === 0;

  return (
    <section className="border-border border-b">
      <div className="px-6 pt-9 pb-2.5">
        <h2 className="font-display m-0 text-[44px] font-normal">{alphabeticalTitle}</h2>
      </div>

      <div className="px-6 pb-16">
        {isLoading ? (
          <div className="border-border flex min-h-48 items-center justify-center border">
            <div className="text-muted-foreground font-mono text-[11px] tracking-[.14em] uppercase">
              {loadingMoreLabel}
            </div>
          </div>
        ) : (
          <div className="border-border grid grid-cols-1 border sm:grid-cols-2 md:grid-cols-3">
            {authors.map((author) => (
              <Link
                key={author.handle}
                to="/authors/$handle"
                params={{ handle: author.handle }}
                className="border-border grid grid-cols-[56px_1fr] items-start gap-3.5 border-r border-b p-5 no-underline transition-colors hover:bg-muted"
              >
                <div
                  className={cn(
                    "flex size-12 items-center justify-center border font-display text-[24px] italic",
                    author.isVerified
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-foreground border-border",
                  )}
                >
                  {getAvatarLabel(author)}
                </div>
                <div>
                  <h4 className="font-display m-0 mb-0.5 text-[22px] font-normal leading-[1.1]">
                    @{author.handle}
                  </h4>
                  <div className="text-muted-foreground mb-2 font-mono text-[10.5px] tracking-[.08em]">
                    {publicAuthorSmallLabel}
                    {author.isVerified && (
                      <span className="text-editorial-green"> · {verifiedSmallLabel} ▣</span>
                    )}
                  </div>
                  <p className="text-muted-foreground m-0 mb-2.5 font-serif text-[13.5px] leading-normal">
                    {getAuthorDisplayName(author)}
                  </p>
                  <div className="text-muted-foreground flex gap-3.5 font-mono text-[10px] tracking-widest uppercase">
                    <span>
                      {skillsLabel}{" "}
                      <b className="text-foreground font-medium">
                        {formatInteger(author.skillCount, locale)}
                      </b>
                    </span>
                    <span>
                      {reposLabel}{" "}
                      <b className="text-foreground font-medium">
                        {formatInteger(author.repoCount, locale)}
                      </b>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {hasNextPage ? (
          <div className="border-border flex justify-center border border-t-0 py-7.5">
            <button
              className="border-border hover:bg-muted h-9 min-w-40 border px-4 font-mono text-[11px] tracking-[.14em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              disabled={query.isFetchingNextPage}
              onClick={() => {
                void query.fetchNextPage();
              }}
              type="button"
            >
              {query.isFetchingNextPage ? loadingMoreLabel : loadMoreLabel}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
};
