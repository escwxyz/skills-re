import { createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { AuthorSkillList } from "@/components/author-skill-list";
import { AuthorStats } from "@/components/author-stats";
import { PageHero } from "@/components/page-hero";
import { getAuthorDetail } from "@/functions/authors/get-author-detail";
import { createSeo } from "@/lib/seo";
import {
  author_page_description,
  author_page_eyebrow,
  author_page_github_profile,
  author_page_verified,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export const Route = createFileRoute("/_publicLayout/authors/$handle")({
  loader: ({ params }) => getAuthorDetail({ data: { handle: params.handle, locale: getLocale() } }),
  head: ({ loaderData }) =>
    createSeo({
      canonicalPath: loaderData ? `/authors/${loaderData.handle}` : "/authors",
      title: loaderData?.name,
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (!data) {
    throw redirect({
      to: "/authors",
    });
  }

  const {
    activity: _,
    avatarLabel,
    githubUrl,
    handle,
    isVerified,
    name,
    skillCount,
    skills,
    stats,
  } = data;

  return (
    <>
      <PageHero
        eyebrow={String(author_page_eyebrow())}
        description={String(author_page_description({ handle }))}
        media={
          <div className="flex flex-col items-center justify-center px-2">
            <div className="bg-foreground text-background border-background font-display flex size-60 items-center justify-center rounded-full border-[6px] border-double text-[120px] italic [outline:1px_solid_var(--foreground)]">
              {avatarLabel}
            </div>
            <div className="text-muted-foreground mt-6 font-mono text-[10.5px] tracking-[.14em] uppercase">
              @{handle}
              {isVerified && (
                <span className="text-editorial-green"> · ● {author_page_verified()}</span>
              )}
            </div>
            {githubUrl && (
              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-border hover:bg-muted rounded-none border px-4 py-2 font-mono text-[10.5px] tracking-[.14em] uppercase transition-colors"
                >
                  {author_page_github_profile()} <ArrowRightIcon />
                </a>
              </div>
            )}
          </div>
        }
      >
        {name}
      </PageHero>

      <AuthorStats stats={stats} />

      <div className="border-border grid grid-cols-1 border-b lg:grid-cols-[2.3fr_1fr]">
        <div className="border-border border-b lg:border-r lg:border-b-0">
          <AuthorSkillList skills={skills} skillCount={skillCount} />
        </div>
        {/* <AuthorActivity items={activity} /> */}
      </div>
    </>
  );
}
