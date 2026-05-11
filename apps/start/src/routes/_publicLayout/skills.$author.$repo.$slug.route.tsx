import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod/v4";

import { InstallTabs } from "@/components/install-tabs";
import { SkillActivityMetrics } from "@/components/skill-activity-metrics";
import { SkillDetailActions } from "@/components/skill-detail-actions";
import { SkillDetailTabActions } from "@/components/skill-detail-tab-actions";
import { SkillDetailTabs } from "@/components/skill-detail-tabs";
import { SkillTag } from "@/components/skill-tag";
import { SkillVersionPanel } from "@/components/skill-version-panel";
import { getSkillBase } from "@/functions/skills/get-skill-base";
import { recordSkillViewFn } from "@/functions/skills/record-skill-view";
import { buildSkillOgImagePath } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import {
  skill_detail_tags,
  skill_detail_no_tags,
  skill_detail_verified,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { SkillBreadcrumb } from "@/components/skill-breadcrumb";
import { getCategoryLabel } from "@/utils/category-data";

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug")({
  loader: async ({ params }) => {
    const data = await getSkillBase({ data: { skillSlug: params.slug } });
    if (!data) {
      throw redirect({ to: "/skills" });
    }
    recordSkillViewFn({
      data: {
        path: `/skills/${params.author}/${params.repo}/${params.slug}`,
        skillId: data.skill.id,
      },
    });
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

  const locale = getLocale();
  const { author, repo, slug } = Route.useParams();
  const { skill } = data;
  const selectedSnapshotId = search.snapshotId ?? null;
  const latestVersion = data.skill.latestVersion ?? "latest";

  return (
    <>
      <SkillBreadcrumb
        skill={{
          id: skill.id,
          slug: skill.slug,
          authorHandle: skill.authorHandle,
          categorySlug: skill.primaryCategory || "other",
          categoryLabel: skill.primaryCategory
            ? getCategoryLabel(skill.primaryCategory, locale)
            : getCategoryLabel("other", locale),
          tags: skill.tags || [],
        }}
      />
      <section className="grid grid-cols-1 border-b lg:grid-cols-[1fr_380px]">
        <div className="border-border border-b px-5 pb-8 pt-8 md:px-7 md:pt-10 lg:border-r lg:border-b-0">
          <h1 className="font-display m-0 mb-4 mt-3.5 text-[clamp(52px,8vw,96px)] font-normal leading-[.95] tracking-[-.02em]">
            {skill.title}
            {skill.isVerified ? (
              <span className="border-border text-muted-foreground ml-3 inline-flex align-middle text-[10px] uppercase tracking-[.12em]">
                {skill_detail_verified()}
              </span>
            ) : null}
          </h1>

          <p className="text-ink-2 m-0 mb-7 max-w-170 font-serif text-[18px] leading-[1.6]">
            {skill.description}
          </p>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-4.5 md:grid-cols-4">
            {/* {layout.metaItems.map((item) => (
              <div key={`${item.label}-${item.value}`}>
                <div className="text-muted-foreground font-mono text-[10px] uppercase tracking-[.16em]">
                  {{
                    Author: skill_detail_meta_author(),
                    Category: skill_detail_meta_category(),
                    License: skill_detail_meta_license(),
                    Published: skill_detail_meta_published(),
                    Repository: skill_detail_meta_repository(),
                    Updated: skill_detail_meta_updated(),
                    Version: skill_detail_meta_version(),
                  }[item.label] ?? item.label}
                </div>
                <div
                  className={cn(
                    "mt-1",
                    item.mono ? "font-mono text-[13px]" : "font-serif text-[15px]",
                  )}
                >
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-3"
                    >
                      {item.value}
                    </a>
                  ) : (
                    item.value
                  )}
                </div>
              </div>
            ))} */}
          </div>

          <SkillActivityMetrics skillId={data.skill.id} />
        </div>

        <div className="border-border border-t lg:border-t-0">
          <div className="border-border border-b p-[18px_22px]">
            <InstallTabs slug={skill.slug} />
          </div>

          <div className="border-border border-b p-[18px_22px]">
            <SkillDetailActions
              snapshotId={selectedSnapshotId}
              slug={skill.slug}
              version={latestVersion}
            />
          </div>
          {/**
           * todo : This part is duplicated with the SkillActivityMetrics component,
           */}
          {/* <div className="border-border border-b p-[18px_22px]">
            <div className="mb-2.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-foreground">
              {skill_detail_performance_metrics()}
            </div>
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.min(Math.max(layout.metricItems.length, 1), 2)}, 1fr)`,
              }}
            >
              {layout.metricItems.map((item) => (
                <div key={item.label} className="py-[8px_2px]">
                  <div className="text-muted-foreground font-mono text-[9.5px] uppercase tracking-[.16em]">
                    {item.label}
                  </div>
                  <div className="font-display mt-1.5 text-[28px] leading-none">{item.value}</div>
                </div>
              ))}
            </div>
          </div> */}

          <SkillVersionPanel
            onSnapshotChange={(id) => {
              navigate({
                replace: true,
                search: (prev) => ({ ...prev, snapshotId: id }),
              });
            }}
            skillId={data.skill.id}
            snapshotId={selectedSnapshotId}
          />

          <div className="p-[18px_22px]">
            <div className="mb-2.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-foreground">
              {skill_detail_tags()}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skill.tags && skill.tags.length > 0 ? (
                skill.tags.map((tag) => <SkillTag key={tag}>{tag}</SkillTag>)
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">
                  {skill_detail_no_tags()}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div
        id="skill-tabs"
        className="scroll-mt-(--header-height) sticky top-(--header-height) z-20 flex border-b border-border bg-background font-mono text-[11px] uppercase tracking-[.14em]"
      >
        <SkillDetailTabs author={author} repo={repo} snapshotId={selectedSnapshotId} slug={slug} />
        <SkillDetailTabActions snapshotId={selectedSnapshotId} skillSlug={slug} />
      </div>

      <div>
        <Outlet />
      </div>
    </>
  );
}
