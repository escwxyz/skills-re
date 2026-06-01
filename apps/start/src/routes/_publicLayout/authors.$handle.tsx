// oxlint-disable no-nested-ternary
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { z } from "zod/v4";
import { useEffect, useState } from "react";

import { AuthorSkillList } from "@/components/author-skill-list";
import { AuthorStats } from "@/components/author-stats";
import { AuthorRepoList } from "@/components/author-repo-list";
import { PageHero } from "@/components/page-hero";
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
  staleTime: 1000 * 60 * 30,
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
  head: ({ loaderData }) => {
    const seo = createSeo({
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
    });

    return {
      ...seo,
      links: [
        ...(loaderData?.author.githubUrl
          ? [
              {
                rel: "preconnect",
                href: new URL(loaderData.author.githubUrl).origin,
                crossOrigin: "anonymous" as const,
              },
            ]
          : []),
        ...(loaderData?.author.avatarUrl
          ? [
              {
                rel: "preload",
                as: "image",
                href: loaderData.author.avatarUrl,
              },
            ]
          : []),
        ...seo.links,
      ],
    };
  },
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
  const [avatarError, setAvatarError] = useState(false);
  const hasAvatarImage = Boolean(author.avatarUrl) && !avatarError;

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
            <div className="size-60 overflow-hidden rounded-none border-4 border-double border-background bg-foreground shadow-none">
              {hasAvatarImage ? (
                <img
                  alt={name}
                  className="aspect-square size-full rounded-none object-cover"
                  fetchPriority="high"
                  height={240}
                  loading="eager"
                  onError={() => {
                    setAvatarError(true);
                  }}
                  src={author.avatarUrl ?? undefined}
                  width={240}
                />
              ) : (
                <div className="flex size-full items-center justify-center rounded-none bg-foreground font-display text-8xl italic text-background">
                  {avatarLabel}
                </div>
              )}
            </div>
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
                className="mt-6 flex flex-wrap items-center justify-center gap-2.5 rounded-none border border-border px-4 py-2 font-mono text-[10.5px] tracking-[.14em] uppercase transition-colors hover:bg-muted"
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
