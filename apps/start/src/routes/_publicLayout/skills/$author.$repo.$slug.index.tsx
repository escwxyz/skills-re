import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod/v4";

import { SkillMdFrontmatter } from "@/components/skill-md-frontmatter";
import { SkillMdContent } from "@/components/skill-md-content";
import { SkillMdToc } from "@/components/skill-md-toc";
import { getSkillDocumentPageData } from "@/functions/skills/get-skill-document";
import { getLocale } from "@/paraglide/runtime";

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug/")({
  loaderDeps: ({ search }) => ({ snapshotId: search.snapshotId }),
  loader: ({ deps, params }) =>
    getSkillDocumentPageData({
      data: { locale: getLocale(), selectedSnapshotId: deps.snapshotId, slug: params.slug },
    }),
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (!data) {
    throw notFound();
  }

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-350 gap-8 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
        {data.tocItems.length > 0 ? <SkillMdToc items={data.tocItems} /> : null}
        <SkillMdContent contentHtml={data.contentHtml} entryMetaLabel={data.entryMetaLabel} />
        {data.frontmatter && <SkillMdFrontmatter {...data.frontmatter} />}
      </div>
    </section>
  );
}
