import { createFileRoute, Link } from "@tanstack/react-router";
import { SealCheckIcon } from "@phosphor-icons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthorsDirectory } from "@/components/authors-directory";
import { PageHero } from "@/components/page-hero";
import { getAuthorsInitial } from "@/functions/authors/get-authors-inital";
import { OG_AUTHORS_IMAGE_PATH } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import { formatInteger } from "@/utils/format";
import { getAuthorDisplayName, getAvatarLabel } from "@/utils/author-shared";
import { sumDailyMetrics } from "@/utils/stats";
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
  m,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_publicLayout/authors/")({
  loader: () => getAuthorsInitial(),
  head: () =>
    createSeo({
      canonicalPath: "/authors",
      image: OG_AUTHORS_IMAGE_PATH,
      title: String(authors_index_title()),
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();

  const locale = getLocale();
  const topAuthors = data.topAuthors.slice(0, 3);
  const heroStats = [
    {
      label: String(authors_index_stats_authors()),
      value: formatInteger(data.authorsCount, locale),
    },
    {
      label: String(authors_index_stats_verified()),
      value: `▣ ${formatInteger(data.verifiedCount, locale)}`,
      accent: "green" as const,
    },
    {
      label: String(authors_index_stats_new_this_week()),
      value: `+ ${formatInteger(sumDailyMetrics(data.dailyMetrics).newSkills, locale)}`,
    },
    {
      label: String(authors_index_stats_skills_published()),
      value: formatInteger(data.skillsCount, locale),
    },
  ];

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
          {topAuthors.map((author, index) => (
            <Link
              key={author.handle}
              to="/authors/$handle"
              params={{ handle: author.handle }}
              className={cn(
                "border-border relative block p-7 no-underline transition-colors hover:bg-muted",
                index < 2 ? "border-r" : "",
              )}
            >
              <div className="text-muted-foreground font-display absolute top-4 right-5 text-[72px] italic leading-none opacity-30">
                № {String(index + 1).padStart(2, "0")}
              </div>

              <Avatar className="font-display mb-5 size-30 rounded-none border-4 border-double border-background [outline:1px_solid_var(--foreground)] after:hidden">
                <AvatarImage
                  src={author.avatarUrl ?? undefined}
                  alt={getAuthorDisplayName(author)}
                  className="rounded-none"
                />
                <AvatarFallback className="rounded-none bg-foreground font-display text-[64px] italic text-background">
                  {getAvatarLabel(author)}
                </AvatarFallback>
              </Avatar>

              <div className="text-muted-foreground mb-3 font-mono text-[10.5px] tracking-[.14em] uppercase">
                {authors_index_public_author()}
                {author.isVerified ? <SealCheckIcon className="inline-block ml-1" /> : ""}
              </div>
              <h3
                // oxlint-disable-next-line no-nested-ternary
                className={`font-display m-0 mb-3 leading-none font-normal tracking-tight${index === 1 ? " text-destructive" : index === 2 ? " text-editorial-blue" : ""}`}
                style={{ fontSize: index === 0 ? "76px" : "44px" }}
              >
                {getAuthorDisplayName(author)}
              </h3>
              <p
                className="text-muted-foreground mb-4 font-serif leading-[1.55]"
                style={{
                  fontSize: index === 0 ? "18px" : "15.5px",
                  maxWidth: index === 0 ? "520px" : "400px",
                }}
              >
                {authors_index_signed_skills_description({ handle: author.handle })}
              </p>
              <div className="text-muted-foreground flex gap-5 font-mono text-[10.5px] tracking-widest uppercase">
                <span>
                  {authors_index_skills()}{" "}
                  <b className="text-foreground font-medium">
                    {formatInteger(author.skillCount, locale)}
                  </b>
                </span>
                <span>
                  {authors_index_repos()}{" "}
                  <b className="text-foreground font-medium">
                    {formatInteger(author.repoCount, locale)}
                  </b>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <AuthorsDirectory
        alphabeticalTitle={String(authors_index_alphabetical_title())}
        locale={locale}
        loadMoreLabel={String(m.load_more())}
        loadingMoreLabel={String(m.loading_more())}
        publicAuthorSmallLabel={String(authors_index_public_author_small())}
        reposLabel={String(authors_index_repos())}
        skillsLabel={String(authors_index_skills())}
        verifiedSmallLabel={String(authors_index_verified_small())}
      />
    </>
  );
}
