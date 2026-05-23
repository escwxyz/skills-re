import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod/v4";

import { SkillMdFrontmatter } from "@/components/skill-md-frontmatter";
import { SkillMdContent } from "@/components/skill-md-content";
import { SkillMdToc } from "@/components/skill-md-toc";
import { getSkillDocument } from "@/functions/skills/get-skill-document";
import { createSkillDetailSeo } from "@/lib/seo";
import { getLocale } from "@/paraglide/runtime";

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug/")({
  loaderDeps: ({ search }) => ({ snapshotId: search.snapshotId }),
  loader: async ({ deps, params }) => {
    const data = await getSkillDocument({
      data: { locale: getLocale(), selectedSnapshotId: deps.snapshotId, skillSlug: params.slug },
    });

    if (!data) {
      throw notFound();
    }
    return data;
  },
  validateSearch: searchSchema,
  head: ({ loaderData, params }) =>
    createSkillDetailSeo({
      authorHandle: params.author,
      canonicalPath: `/skills/${params.author}/${params.repo}/${params.slug}/`,
      description: loaderData?.frontmatter?.description,
      locale: getLocale(),
      skillTitle: loaderData?.frontmatter?.name,
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-350 gap-8 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
        <SkillMdToc items={data.tocItems} />
        <SkillMdContent contentHtml={data.contentHtml} entryMetaLabel={data.entryMetaLabel} />
        {data.frontmatter && <SkillMdFrontmatter {...data.frontmatter} />}
      </div>
    </section>
  );
}
