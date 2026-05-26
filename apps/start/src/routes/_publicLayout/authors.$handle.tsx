// oxlint-disable no-nested-ternary
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { z } from "zod/v4";
import { useEffect } from "react";

import { AuthorSkillList } from "@/components/author-skill-list";
import { AuthorStats } from "@/components/author-stats";
import { AuthorRepoList } from "@/components/author-repo-list";
import { PageHero } from "@/components/page-hero";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAuthorDetail } from "@/functions/authors/get-author-detail";
import { getAuthorRepos } from "@/functions/authors/get-author-repos";
import { buildAuthorOgImagePath } from "@/lib/og-image-paths";
import { createProfilePageSchema, createSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/constants";
import {
  author_page_eyebrow,
  author_page_github_profile,
  author_page_verified,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getAuthorDisplayName, getAvatarLabel } from "@/utils/author-shared";

const authorSearchSchema = z.object({
  repo: z.string().trim().min(1).optional(),
});

export const Route = createFileRoute("/_publicLayout/authors/$handle")({
  validateSearch: authorSearchSchema,
  loader: async ({ params }) => {
    const [author, reposPage] = await Promise.all([
      getAuthorDetail({ data: { handle: params.handle } }),
      getAuthorRepos({ data: { handle: params.handle, limit: 100 } }),
    ]);

    if (!author) {
      throw redirect({ to: "/authors" });
    }

    return {
      author,
      reposPage,
    };
  },
  head: ({ loaderData }) =>
    createSeo({
      canonicalPath: loaderData ? `/authors/${loaderData.author.handle}` : "/authors",
      description: loaderData ? (loaderData.author.bio ?? undefined) : undefined,
      includePageStructuredData: false,
      image: loaderData ? buildAuthorOgImagePath(loaderData.author.handle) : undefined,
      structuredData: loaderData
        ? [
            createProfilePageSchema({
              alternateName: loaderData.author.handle,
              canonicalUrl: `${SITE_URL}/authors/${loaderData.author.handle}`,
              description: loaderData.author.bio ?? undefined,
              identifier: loaderData.author.handle,
              image: loaderData.author.avatarUrl ?? undefined,
              name: loaderData.author.name ?? `@${loaderData.author.handle}`,
              sameAs: loaderData.author.githubUrl ? [loaderData.author.githubUrl] : undefined,
            }),
          ]
        : [],
      title: loaderData?.author.name ?? `@${loaderData?.author.handle}`,
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const { author, reposPage } = Route.useLoaderData();
  const { repo: selectedRepoName } = Route.useSearch();
  const navigate = useNavigate({ from: "/authors/$handle" });
  const activeRepoName = selectedRepoName
    ? reposPage.repos.some((repo) => repo.repoName === selectedRepoName)
      ? selectedRepoName
      : undefined
    : undefined;

  const { handle, githubUrl, isVerified, repoCount, skillCount } = author;
  const name = getAuthorDisplayName(author);
  const avatarLabel = getAvatarLabel(author);
  const authorDescription = author.bio ?? undefined;

  useEffect(() => {
    if (selectedRepoName && !activeRepoName) {
      void navigate({
        replace: true,
        search: (prev) => ({
          ...prev,
          repo: undefined,
        }),
      });
    }
  }, [activeRepoName, navigate, selectedRepoName]);

  const handleSelectRepo = (nextRepoName?: string) => {
    void navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        repo: nextRepoName,
      }),
    });
  };

  return (
    <>
      <PageHero
        alignItems="center"
        eyebrow={String(author_page_eyebrow())}
        description={authorDescription}
        media={
          <div className="flex flex-col items-center justify-center px-2">
            <Avatar className="size-60 overflow-hidden rounded-none border-4 border-double border-background bg-foreground shadow-none after:rounded-none">
              {author.avatarUrl ? (
                <AvatarImage
                  className="rounded-none object-cover"
                  alt={name}
                  src={author.avatarUrl}
                />
              ) : null}
              <AvatarFallback className="rounded-none bg-foreground font-display text-8xl italic text-background">
                {avatarLabel}
              </AvatarFallback>
            </Avatar>
            <div className="text-muted-foreground mt-6 font-mono text-xs uppercase">
              @{handle}
              {isVerified && (
                <span className="text-editorial-green"> · ● {author_page_verified()}</span>
              )}
            </div>
            {githubUrl ? (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex flex-wrap justify-center items-center gap-2.5 border-border hover:bg-muted rounded-none border px-4 py-2 font-mono text-[10.5px] tracking-[.14em] uppercase transition-colors"
              >
                {author_page_github_profile()} <ArrowRightIcon />
              </a>
            ) : null}
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

      <div className="border-border grid grid-cols-1 border-b lg:grid-cols-[2.3fr_1fr] lg:items-start">
        <div className="border-border border-b lg:border-r lg:border-b-0">
          <AuthorSkillList handle={handle} repoName={activeRepoName} />
        </div>
        <AuthorRepoList
          onSelectRepo={handleSelectRepo}
          repoCount={repoCount ?? reposPage.repos.length}
          repos={reposPage.repos}
          selectedRepoName={activeRepoName}
        />
      </div>
    </>
  );
}
