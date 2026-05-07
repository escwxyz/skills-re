import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SealCheckIcon } from "@phosphor-icons/react";
import { PageHero } from "@/components/page-hero";
import { getAuthorsList } from "@/functions/authors/get-authors-list";
import { createSeo } from "@/lib/seo";
import {
  authors_index_alphabetical_title,
  authors_index_description,
  authors_index_eyebrow,
  authors_index_hero_line,
  authors_index_public_author,
  authors_index_public_author_small,
  authors_index_repos,
  authors_index_signed_skills_description,
  authors_index_skills,
  authors_index_stats_authors,
  authors_index_stats_new_this_week,
  authors_index_stats_skills_published,
  authors_index_stats_verified,
  authors_index_title,
  authors_index_top_authors_title,
  authors_index_top_authors_subtitle,
  authors_index_verified_small,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { cn } from "@/lib/utils";

const STAT_LABELS = {
  authors: authors_index_stats_authors,
  verified: authors_index_stats_verified,
  new_this_week: authors_index_stats_new_this_week,
  skills_published: authors_index_stats_skills_published,
} as const;

export const Route = createFileRoute("/_publicLayout/authors/")({
  loader: () => getAuthorsList({ data: { locale: getLocale() } }),
  head: () =>
    createSeo({
      canonicalPath: "/authors",
      title: String(authors_index_title()),
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (!data) {
    throw notFound();
  }

  const { alphabeticalAuthors, stats, topAuthors } = data;

  const heroStats = stats.map((s) => ({
    label: String(STAT_LABELS[s.label as keyof typeof STAT_LABELS]?.() ?? s.label),
    value: s.value,
    accent: s.accent,
  }));

  return (
    <>
      <PageHero
        eyebrow={String(authors_index_eyebrow())}
        description={String(authors_index_description())}
        descriptionItalic
        stats={heroStats}
      >
        {authors_index_hero_line()}
      </PageHero>

      {/* Top authors */}
      <section className="border-border border-b-[3px]">
        <div className="flex items-baseline justify-between px-6 pt-7 pb-3.5">
          <h2 className="font-display m-0 text-[44px] font-normal">
            {authors_index_top_authors_title()}
          </h2>
          <div className="text-muted-foreground font-mono text-[10.5px] tracking-[.14em] uppercase">
            {authors_index_top_authors_subtitle()}
          </div>
        </div>

        <div
          className="border-border grid border-t"
          style={{ gridTemplateColumns: "1.4fr 1fr 1fr" }}
        >
          {topAuthors.map((author, i) => (
            <Link
              key={author.handle}
              to="/authors/$handle"
              params={{ handle: author.handle }}
              className={cn(
                "border-border relative block p-7 no-underline transition-colors hover:bg-muted",
                i < 2 ? "border-r" : "",
              )}
            >
              <div className="text-muted-foreground font-display absolute top-4 right-5 text-[72px] italic leading-none opacity-30">
                № {String(i + 1).padStart(2, "0")}
              </div>

              {i === 0 && (
                <div className="bg-foreground text-background border-background font-display mb-5 flex size-30 items-center justify-center rounded-full border-4 border-double text-[64px] italic [outline:1px_solid_var(--foreground)]">
                  {author.avatarLabel}
                </div>
              )}

              <div className="text-muted-foreground mb-3 font-mono text-[10.5px] tracking-[.14em] uppercase">
                {authors_index_public_author()}
                {author.isVerified ? <SealCheckIcon className="inline-block ml-1" /> : ""}
              </div>
              <h3
                // oxlint-disable-next-line no-nested-ternary
                className={`font-display m-0 mb-3 leading-none font-normal tracking-tight${i === 1 ? " text-destructive" : i === 2 ? " text-editorial-blue" : ""}`}
                style={{ fontSize: i === 0 ? "76px" : "44px" }}
              >
                {author.name}
              </h3>
              <p
                className="text-muted-foreground mb-4 font-serif leading-[1.55]"
                style={{
                  fontSize: i === 0 ? "18px" : "15.5px",
                  maxWidth: i === 0 ? "520px" : "400px",
                }}
              >
                {authors_index_signed_skills_description({ handle: author.handle })}
              </p>
              <div className="text-muted-foreground flex gap-5 font-mono text-[10.5px] tracking-widest uppercase">
                <span>
                  {authors_index_skills()}{" "}
                  <b className="text-foreground font-medium">{author.skillCountLabel}</b>
                </span>
                <span>
                  {authors_index_repos()}{" "}
                  <b className="text-foreground font-medium">{author.repoCountLabel}</b>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Alphabetical authors grid */}
      <div className="px-6 pt-9 pb-2.5">
        <h2 className="font-display m-0 text-[44px] font-normal">
          {authors_index_alphabetical_title()}
        </h2>
      </div>

      <div className="px-6 pb-16">
        <div className="border-border grid grid-cols-1 border sm:grid-cols-2 md:grid-cols-3">
          {alphabeticalAuthors.map((author) => (
            <Link
              key={author.handle}
              to="/authors/$handle"
              params={{ handle: author.handle }}
              className="border-border grid grid-cols-[56px_1fr] items-start gap-3.5 border-r border-b p-5 no-underline transition-colors hover:bg-muted"
            >
              <div
                className={`flex size-12 items-center justify-center rounded-full border font-display text-[24px] italic${author.isVerified ? " bg-foreground text-background border-foreground" : " bg-background text-foreground border-border"}`}
              >
                {author.avatarLabel}
              </div>
              <div>
                <h4 className="font-display m-0 mb-0.5 text-[22px] font-normal leading-[1.1]">
                  @{author.handle}
                </h4>
                <div className="text-muted-foreground mb-2 font-mono text-[10.5px] tracking-[.08em]">
                  {authors_index_public_author_small()}
                  {author.isVerified && (
                    <span className="text-editorial-green">
                      {" "}
                      · {authors_index_verified_small()} ▣
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground m-0 mb-2.5 font-serif text-[13.5px] leading-normal">
                  {author.name}
                </p>
                <div className="text-muted-foreground flex gap-3.5 font-mono text-[10px] tracking-widest uppercase">
                  <span>
                    {authors_index_skills()}{" "}
                    <b className="text-foreground font-medium">{author.skillCountLabel}</b>
                  </span>
                  <span>
                    {authors_index_repos()}{" "}
                    <b className="text-foreground font-medium">{author.repoCountLabel}</b>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
