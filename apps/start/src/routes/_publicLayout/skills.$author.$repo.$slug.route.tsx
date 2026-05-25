import { useEffect, useRef, useState } from "react";
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
import { SkillBreadcrumb } from "@/components/skill-breadcrumb";
import { SkillDetailTags } from "@/components/skill-detail-tags";
import { SkillDetailCategory } from "@/components/skill-detail-category";
import { ReviewRatingTrigger } from "@/components/review-rating-trigger";
import { SkillRelated } from "@/components/skill-related";
import type { CategorySlug } from "@skills-re/contract/categories-taxonomy";
import { useIsMobile } from "@/hooks/use-mobile";
import { WriteReviewDialog } from "@/components/write-review-cta";
import { SkillDetailStats } from "@/components/skill-detail-stats";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { createSkillDetailSeo } from "@/lib/seo";
import { skill_detail_read_full_description, skill_detail_verified } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

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
    createSkillDetailSeo({
      authorHandle: params.author,
      canonicalPath: `/skills/${params.author}/${params.repo}/${params.slug}/`,
      description: loaderData?.skill.description,
      image:
        buildSkillOgImagePath({
          authorHandle: params.author,
          repoName: params.repo,
          skillSlug: params.slug,
        }) ?? undefined,
      locale: getLocale(),
      skillTitle: loaderData?.skill.title,
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const location = useLocation();

  const isMobile = useIsMobile();
  const descRef = useRef<HTMLParagraphElement>(null);
  const [isDescClipped, setIsDescClipped] = useState(false);

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
    const el = descRef.current;
    if (el) {
      setIsDescClipped(el.scrollHeight > el.clientHeight);
    }
  }, [skill.description]);

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

          <div className="mb-7 space-y-2">
            <p
              ref={descRef}
              className="text-muted-foreground m-0 max-w-170 font-serif text-lg line-clamp-3"
            >
              {skill.description}
            </p>
            {isDescClipped && (
              <Dialog>
                <DialogTrigger className="font-mono text-[10.5px] uppercase tracking-[.14em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  {skill_detail_read_full_description()}
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <p className="font-serif text-base text-foreground/80 leading-relaxed">
                    {skill.description}
                  </p>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="flex justify-between items-center gap-2">
            <div className="space-y-4">
              <SkillDetailCategory
                categorySlug={(skill.primaryCategory ?? "other") as CategorySlug}
              />
              <SkillDetailTags tags={skill.tags} />
            </div>
            <ReviewRatingTrigger skillId={skill.id} />
          </div>

          <div className="border-border mt-8 border-t pt-6 grid grid-cols-1 md:grid-cols-3 md:gap-0 gap-6 items-center">
            <div className="col-span-2">
              <SkillDetailStats
                auditScore={skill.latestAuditScore ?? null}
                createdAt={skill.createdAt ?? null}
                downloadsAllTime={skill.downloadsAllTime ?? null}
                latestSnapshotTotalBytes={skill.latestSnapshotTotalBytes ?? null}
                skillId={skill.id}
                viewsAllTime={skill.viewsAllTime ?? null}
              />
            </div>

            <div className="col-span-1 border-t border-border pt-6 md:border-t-0 md:border-l md:pl-6 md:pt-0">
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

          <div className="py-4 space-y-4">
            {isMobile ? null : <InstallTabs author={author} repo={repo} slug={skill.slug} />}

            <SkillDetailActions
              snapshotId={selectedSnapshotId}
              slug={skill.slug}
              skillId={skill.id}
              title={skill.title}
              version={latestVersion}
            />
          </div>
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
      <SkillRelated primaryCategory={skill.primaryCategory} skillId={skill.id} tags={skill.tags} />
      <WriteReviewDialog />
    </>
  );
}
