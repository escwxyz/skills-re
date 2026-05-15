import { useEffect } from "react";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { z } from "zod/v4";

import { InstallTabs } from "@/components/install-tabs";
import { SkillDetailActions } from "@/components/skill-detail-actions";
import { SkillDetailTabActions } from "@/components/skill-detail-tab-actions";
import { SkillDetailTabs } from "@/components/skill-detail-tabs";
import { SkillDetailMetadata } from "@/components/skill-detail-metadata";
import { SkillVersionPanel } from "@/components/skill-version-panel";
import { getSkillBase } from "@/functions/skills/get-skill-base";
import { recordSkillView } from "@/functions/skills/record-skill-view";
import { buildSkillOgImagePath } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import { skill_detail_verified } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { SkillBreadcrumb } from "@/components/skill-breadcrumb";
import { SkillDetailTags } from "@/components/skill-detail-tags";
import { SkillDetailCategory } from "@/components/skill-detail-category";
import { ReviewRatingTrigger } from "@/components/review-rating-trigger";
import type { CategorySlug } from "@skills-re/contract/categories-taxonomy";
import { useIsMobile } from "@/hooks/use-mobile";
import { WriteReviewDialog } from "@/components/write-review-cta";

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug")({
  loader: async ({ location, params }) => {
    const data = await getSkillBase({ data: { skillSlug: params.slug } });
    if (!data) {
      throw redirect({ to: "/skills" });
    }

    const canonicalAuthor = data.skill.authorHandle;
    const canonicalRepo = data.skill.repoName;
    if (params.author !== canonicalAuthor || params.repo !== canonicalRepo) {
      throw redirect({
        hash: location.hash,
        params: {
          author: canonicalAuthor,
          repo: canonicalRepo,
          slug: params.slug,
        },
        replace: true,
        search: location.search,
        to: "/skills/$author/$repo/$slug",
      });
    }

    return data;
  },
  validateSearch: searchSchema,
  head: ({ loaderData, params }) =>
    createSeo({
      canonicalPath: `/skills/${params.author}/${params.repo}/${params.slug}`,
      description: loaderData?.skill.description,
      image:
        buildSkillOgImagePath({
          authorHandle: params.author,
          repoName: params.repo,
          skillSlug: params.slug,
        }) ?? undefined,
      title: loaderData?.skill.title,
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const location = useLocation();

  const isMobile = useIsMobile();

  const { author, repo, slug } = Route.useParams();
  const { skill } = data;
  const selectedSnapshotId = search.snapshotId ?? skill.latestSnapshotId ?? null;
  const latestVersion = data.skill.latestVersion ?? "latest";
  const debouncedRecordSkillView = useDebouncedCallback(
    async (view: { path: string; skillId: string }) => {
      try {
        await recordSkillView(view);
      } catch (error) {
        console.error("[skill.view] failed", {
          error: error instanceof Error ? error.message : String(error),
          skillId: view.skillId,
        });
      }
    },
    {
      key: `skill-view:${skill.id}`,
      leading: true,
      trailing: false,
      wait: 1000,
    },
  );

  useEffect(() => {
    if (!skill.id) {
      return;
    }

    debouncedRecordSkillView({
      path: location.pathname,
      skillId: skill.id,
    });
  }, [debouncedRecordSkillView, location.pathname, skill.id]);

  return (
    <>
      <section className="grid grid-cols-1 border-b lg:grid-cols-[1fr_380px]">
        <div className="border-border border-b px-4 pb-8 pt-8 md:px-6 md:pt-10 lg:border-r lg:border-b-0 space-y-4">
          <SkillBreadcrumb
            skill={{
              id: skill.id,
              repoName: skill.repoName,
              slug: skill.slug,
              authorHandle: skill.authorHandle,
            }}
          />
          <h1 className="font-display m-0 mb-4 mt-3.5 text-4xl md:text-5xl lg:text-6xl font-normal">
            {skill.title}
            {skill.isVerified ? (
              <span className="border-border text-muted-foreground ml-3 inline-flex align-middle text-xs uppercase">
                {skill_detail_verified()}
              </span>
            ) : null}
          </h1>

          <p className="text-muted-foreground m-0 mb-7 max-w-170 font-serif text-lg">
            {skill.description}
          </p>

          <div className="flex justify-between items-center">
            <div className="space-y-4">
              <SkillDetailCategory
                categorySlug={(skill.primaryCategory ?? "other") as CategorySlug}
              />
              <SkillDetailTags tags={skill.tags} />
            </div>
            <ReviewRatingTrigger skillId={skill.id} />
          </div>

          <div className="border-border mt-8 border-t pt-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="col-span-2">TODO</div>

            <div className="col-span-1 space-y-4">
              {isMobile ? null : <InstallTabs author={author} repo={repo} slug={skill.slug} />}

              <SkillDetailActions
                snapshotId={selectedSnapshotId}
                slug={skill.slug}
                version={latestVersion}
              />
            </div>
          </div>
        </div>

        <div className="border-border border-t lg:border-t-0 px-4 md:px-6">
          <SkillDetailMetadata
            authorHandle={skill.authorHandle}
            forkCount={skill.forkCount}
            license={skill.license}
            repoName={skill.repoName}
            repoUrl={skill.repoUrl}
            stargazerCount={skill.stargazerCount}
            updatedAt={skill.updatedAt}
          />

          <SkillVersionPanel
            author={author}
            onSnapshotChange={(id) => {
              navigate({
                replace: true,
                search: (prev) => ({ ...prev, snapshotId: id }),
              });
            }}
            repo={repo}
            skillId={data.skill.id}
            snapshotId={selectedSnapshotId}
            slug={slug}
          />
        </div>
      </section>

      <div
        id="skill-tabs"
        className="scroll-mt-(--header-height) sticky top-(--header-height) z-20 flex h-(--header-height) border-b border-border bg-background font-mono text-xs uppercase"
      >
        <SkillDetailTabs author={author} repo={repo} snapshotId={selectedSnapshotId} slug={slug} />
        <SkillDetailTabActions snapshotId={selectedSnapshotId} skillSlug={slug} />
      </div>

      <div>
        <Outlet />
      </div>
      <WriteReviewDialog />
    </>
  );
}
