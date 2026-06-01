import { Await, createFileRoute, defer } from "@tanstack/react-router";
import { z } from "zod/v4";

import { SkillMdFrontmatter } from "@/components/skill-md-frontmatter";
import { SkillMdContent } from "@/components/skill-md-content";
import { SkillMdToc } from "@/components/skill-md-toc";
import { getSkillDocument } from "@/functions/skills/get-skill-document";
import { createSkillDetailSeo } from "@/lib/seo";
import { getLocale } from "@/paraglide/runtime";
import { skillDetailRouteApi } from "./skills.$author.$repo.$slug.route";

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug/")({
  loaderDeps: ({ search }) => ({ snapshotId: search.snapshotId }),
  loader: ({ context, deps }) => {
    const resolvedSkill = {
      authorHandle: context.skillDetail.skill.authorHandle,
      description: context.skillDetail.skill.description,
      id: context.skillDetail.skill.id,
      latestVersion: context.skillDetail.skill.latestVersion ?? null,
      repoName: context.skillDetail.skill.repoName,
      skillSlug: context.skillDetail.skill.slug,
      title: context.skillDetail.skill.title,
    };

    return {
      document: defer(
        getSkillDocument({
          data: {
            locale: getLocale(),
            resolvedSkill,
            selectedSnapshotId: deps.snapshotId,
          },
        }),
      ),
      headData: {
        description: resolvedSkill.description,
        title: resolvedSkill.title,
      },
    };
  },
  validateSearch: searchSchema,
  head: ({ loaderData, params }) =>
    createSkillDetailSeo({
      authorHandle: params.author,
      canonicalPath: `/skills/${params.author}/${params.repo}/${params.slug}`,
      description: loaderData?.headData.description,
      locale: getLocale(),
      skillTitle: loaderData?.headData.title,
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const parentData = skillDetailRouteApi.useLoaderData();

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <Await
        promise={data.document}
        fallback={<SkillDocumentFallback skillTitle={parentData.skill.title} />}
      >
        {(document) =>
          document ? (
            <div className="mx-auto grid max-w-350 gap-8 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
              <SkillMdToc items={document.tocItems} />
              <SkillMdContent
                contentHtml={document.contentHtml}
                entryMetaLabel={document.entryMetaLabel}
              />
              {document.frontmatter && <SkillMdFrontmatter {...document.frontmatter} />}
            </div>
          ) : (
            <SkillDocumentUnavailable />
          )
        }
      </Await>
    </section>
  );
}

const SkillDocumentFallback = ({ skillTitle }: { skillTitle: string }) => (
  <div className="mx-auto grid max-w-350 gap-8 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
    <aside className="hidden lg:block">
      <div className="mb-2 h-3 w-16 animate-pulse bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-3 animate-pulse bg-muted"
            style={{ width: index % 2 === 0 ? "70%" : "52%" }}
          />
        ))}
      </div>
    </aside>

    <div className="mx-auto min-w-0 w-full max-w-180 overflow-x-hidden" data-skill-md-content>
      <div className="mb-4 h-3 w-56 animate-pulse bg-muted" />
      <article className="space-y-5">
        <div className="h-9 w-2/3 animate-pulse bg-muted" />
        <div className="h-4 w-full animate-pulse bg-muted" />
        <div className="h-4 w-[92%] animate-pulse bg-muted" />
        <div className="h-4 w-[84%] animate-pulse bg-muted" />
        <div className="h-8 w-48 animate-pulse bg-muted" />
        <div className="h-4 w-full animate-pulse bg-muted" />
        <div className="h-4 w-[88%] animate-pulse bg-muted" />
      </article>
      <p className="mt-6 font-mono text-[10.5px] uppercase tracking-[.14em] text-muted-foreground">
        Loading {skillTitle}
      </p>
    </div>

    <aside className="hidden lg:block">
      <div className="mb-2 h-3 w-24 animate-pulse bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse bg-muted" />
        ))}
      </div>
    </aside>
  </div>
);

const SkillDocumentUnavailable = () => (
  <div className="mx-auto max-w-180">
    <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-muted-foreground">
      Snapshot content unavailable
    </p>
  </div>
);
