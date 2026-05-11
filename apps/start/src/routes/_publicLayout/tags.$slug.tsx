import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { PageHero } from "@/components/page-hero";
import { TagTopSkills } from "@/components/tag-top-skills";
import { buttonVariants } from "@/components/ui/button";
import { buildTagOgImagePath } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import { buildTagSeo, formatPublicSkillCount } from "@/lib/seo-taxonomy";
import { getTagDetail } from "@/functions/get-tag-detail";
import { cn, kebabToTitle } from "@/lib/utils";
import {
  tag_page_noindexed_notice,
  tag_page_related_categories,
  tag_page_related_tags,
  tag_page_see_all_skills,
  tags_eyebrow,
  tags_skill_tags,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export const Route = createFileRoute("/_publicLayout/tags/$slug")({
  loader: ({ params }) => getTagDetail({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    const seo = buildTagSeo({
      count: loaderData?.count ?? 0,
      locale: getLocale(),
      slug: loaderData?.slug ?? "tag",
    });

    return createSeo({
      canonicalPath: loaderData ? `/tags/${loaderData.slug}` : "/tags",
      description: seo.description,
      image: loaderData?.indexable ? buildTagOgImagePath(loaderData.slug) : undefined,
      noIndex: loaderData ? !loaderData.indexable : true,
      title: seo.title,
      locale: getLocale(),
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const tag = Route.useLoaderData();
  if (!tag) {
    throw notFound();
  }

  const seo = buildTagSeo({
    count: tag.count,
    locale: getLocale(),
    slug: tag.slug,
  });
  const locale = getLocale();
  const relatedCategoriesPreview = tag.relatedCategories.slice(0, 4);
  const relatedTagsPreview = tag.relatedTags.slice(0, 6);

  return (
    <>
      <PageHero
        eyebrow={String(tags_eyebrow())}
        description={seo.description}
        descriptionItalic
        borderThick
        aside={
          <div className="space-y-1 font-mono text-[11px] tracking-widest uppercase">
            <div>
              {tags_skill_tags()}{" "}
              <b className="text-foreground font-medium">
                {formatPublicSkillCount(tag.count, locale)}
              </b>
            </div>
            <div>
              {tag_page_related_categories()}{" "}
              <b className="text-editorial-green font-medium">
                {tag.relatedCategories.length.toLocaleString(locale)}
              </b>
            </div>
            <div>
              {tag_page_related_tags()}{" "}
              <b className="text-editorial-blue font-medium">
                {tag.relatedTags.length.toLocaleString(locale)}
              </b>
            </div>
            <div className="pt-2">
              {tag.indexable ? (
                <span className="text-foreground">Indexable</span>
              ) : (
                <span className="text-muted-foreground">{tag_page_noindexed_notice()}</span>
              )}
            </div>
          </div>
        }
      >
        {seo.heading}
      </PageHero>

      <section className="grid grid-cols-1 border-b border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <aside className="border-border border-b px-6 py-8 lg:border-b-0 lg:border-r">
          <div className="mb-4 font-mono text-[10.5px] tracking-[.16em] uppercase text-muted-foreground">
            § {tags_skill_tags()}
          </div>
          <p className="max-w-2xl font-serif text-[17px] leading-[1.65] text-ink-2">
            {seo.description}
          </p>
          <p className="mt-4 max-w-2xl font-mono text-[11px] leading-relaxed tracking-[.12em] uppercase text-muted-foreground">
            {tag.indexable
              ? "This tag is indexable and ready for discovery."
              : "This tag is crawlable, but currently noindexed."}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/skills"
              search={{ tags: [tag.slug] }}
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "font-mono text-[10px] uppercase tracking-[.14em]",
              )}
            >
              {tag_page_see_all_skills()}
            </Link>
            <Link
              to="/tags"
              className="border-border hover:bg-muted rounded-none border px-4 py-2 font-mono text-[10px] tracking-[.14em] uppercase transition-colors"
            >
              {tags_skill_tags()}
            </Link>
          </div>
        </aside>

        <div className="px-6 py-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <div className="mb-3 font-mono text-[10.5px] tracking-[.16em] uppercase text-muted-foreground">
                {tag_page_related_categories()}
              </div>
              <div className="flex flex-wrap gap-2">
                {relatedCategoriesPreview.length > 0 ? (
                  relatedCategoriesPreview.map((category) => (
                    <Link
                      key={category.slug}
                      to="/categories/$slug"
                      params={{ slug: category.slug }}
                      className="rounded-none border border-border bg-card/40 px-3 py-2 font-mono text-[10.5px] tracking-widest uppercase transition-colors hover:border-foreground hover:text-foreground"
                    >
                      {category.name} · {category.count}
                    </Link>
                  ))
                ) : (
                  <span className="text-muted-foreground font-mono text-[10.5px] tracking-[.14em] uppercase">
                    —
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 font-mono text-[10.5px] tracking-[.16em] uppercase text-muted-foreground">
                {tag_page_related_tags()}
              </div>
              <div className="flex flex-wrap gap-2">
                {relatedTagsPreview.length > 0 ? (
                  relatedTagsPreview.map((relatedTag) => (
                    <Link
                      key={relatedTag.slug}
                      to="/tags/$slug"
                      params={{ slug: relatedTag.slug }}
                      className="rounded-none border border-border bg-card/40 px-3 py-2 font-mono text-[10.5px] tracking-widest uppercase transition-colors hover:border-foreground hover:text-foreground"
                    >
                      #{kebabToTitle(relatedTag.slug)} · {relatedTag.count}
                    </Link>
                  ))
                ) : (
                  <span className="text-muted-foreground font-mono text-[10.5px] tracking-[.14em] uppercase">
                    —
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <TagTopSkills slug={tag.slug} />
    </>
  );
}
