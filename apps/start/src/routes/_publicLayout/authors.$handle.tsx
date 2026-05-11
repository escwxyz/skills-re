import { createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowRightIcon } from "@phosphor-icons/react";

import { AuthorSkillList } from "@/components/author-skill-list";
import { AuthorStats } from "@/components/author-stats";
import { PageHero } from "@/components/page-hero";
import { getAuthorDetail } from "@/functions/authors/get-author-detail";
import { buildAuthorOgImagePath } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import {
  author_page_description,
  author_page_eyebrow,
  author_page_github_profile,
  author_page_verified,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getAuthorDisplayName, getAvatarLabel } from "@/utils/author-shared";

export const Route = createFileRoute("/_publicLayout/authors/$handle")({
  loader: async ({ params }) => {
    const author = await getAuthorDetail({ data: { handle: params.handle } });

    if (!author) {
      throw redirect({ to: "/authors" });
    }

    return author;
  },
  head: ({ loaderData }) =>
    createSeo({
      canonicalPath: loaderData ? `/authors/${loaderData.handle}` : "/authors",
      description: loaderData
        ? String(author_page_description({ handle: loaderData.handle }))
        : undefined,
      image: loaderData ? buildAuthorOgImagePath(loaderData.handle) : undefined,
      title: loaderData?.name ?? loaderData?.handle,
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const author = Route.useLoaderData();

  const { handle, githubUrl, isVerified, repoCount, skillCount } = author;
  const name = getAuthorDisplayName(author);
  const avatarLabel = getAvatarLabel(author);

  return (
    <>
      <PageHero
        eyebrow={String(author_page_eyebrow())}
        description={String(author_page_description({ handle }))}
        media={
          <div className="flex flex-col items-center justify-center px-2">
            <div className="bg-foreground text-background border-background font-display flex size-60 items-center justify-center border-[6px] border-double text-[120px] italic [outline:1px_solid_var(--foreground)]">
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

      <AuthorStats
        handle={handle}
        repoCount={repoCount ?? undefined}
        skillCount={skillCount ?? undefined}
      />

      <div className="border-border grid grid-cols-1 border-b lg:grid-cols-[2.3fr_1fr]">
        <div className="border-border border-b lg:border-r lg:border-b-0">
          <AuthorSkillList handle={handle} />
        </div>
        {/* <AuthorActivity items={activity} /> */}
      </div>
    </>
  );
}
