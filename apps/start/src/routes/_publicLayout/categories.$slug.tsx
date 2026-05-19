import { useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { CategoryOtherClassifications } from "@/components/category-other-classifications";
import { CategoryTopSkills } from "@/components/category-top-skills";
import { TITLE_VARIANT_CLASS } from "@/components/category-card";
import { PageHero } from "@/components/page-hero";
import { getCategoryDetail } from "@/functions/categories/get-category-detail";
import { buildCategoryOgImagePath } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import {
  categories_page_breadcrumb,
  categories_page_eyebrow,
  categories_page_related_tags,
  categories_page_skills_indexed,
  categories_page_tags_show_all,
  categories_page_tags_show_fewer,
  categories_page_title,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import {
  getCategoryDescription,
  getCategoryPresentation,
  getCategoryTitle,
} from "@/utils/category-data";

export const Route = createFileRoute("/_publicLayout/categories/$slug")({
  loader: ({ params }) => getCategoryDetail({ data: { slug: params.slug } }),
  head: ({ loaderData }) =>
    createSeo({
      canonicalPath: loaderData ? `/categories/${loaderData.slug}` : "/categories",
      description: loaderData ? getCategoryDescription(loaderData.slug, getLocale()) : undefined,
      image: loaderData ? buildCategoryOgImagePath(loaderData.slug) : undefined,
      title: loaderData
        ? `${getCategoryTitle(loaderData.slug, getLocale())} — ${String(categories_page_title())}`
        : undefined,
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (!data) {
    throw notFound();
  }

  const { count, relatedTags, slug } = data;
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const locale = getLocale();
  const presentation = getCategoryPresentation(slug, undefined, locale);
  const titleVariantClass = TITLE_VARIANT_CLASS[presentation.variant ?? "default"] ?? "";
  const title = getCategoryTitle(slug, locale);
  const description = getCategoryDescription(slug, locale);

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-border text-muted-foreground flex items-center gap-1.5 border-b px-6 py-2.5 font-mono text-[10.5px] tracking-[.14em] uppercase">
        <Link to="/categories" className="hover:text-foreground transition-colors">
          {categories_page_breadcrumb()}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{title}</span>
      </div>

      {/* Hero */}
      <PageHero
        eyebrow={String(categories_page_eyebrow({ num: presentation.num }))}
        description={description}
        borderThick
        aside={
          <div className="text-muted-foreground space-y-1 font-mono text-[11px] tracking-widest uppercase">
            <div>
              {categories_page_skills_indexed()}{" "}
              <b className="text-foreground font-medium">{count.toLocaleString(locale)}</b>
            </div>
            <div>
              {categories_page_related_tags()}{" "}
              <b className="text-editorial-green font-medium">
                {relatedTags.length.toLocaleString(locale)}
              </b>
            </div>
          </div>
        }
      >
        <span className={cn(titleVariantClass)}>{title}</span>
      </PageHero>

      {/* Related tags */}
      {relatedTags.length > 0 && (
        <section className="border-border border-b px-6 py-6">
          <div className="text-muted-foreground mb-3 font-mono text-[10px] tracking-[.16em] uppercase">
            {categories_page_related_tags()}
          </div>
          <div className="flex flex-wrap gap-2">
            {(tagsExpanded ? relatedTags : relatedTags.slice(0, 30)).map(
              ({ slug: tag, count: tagCount }) => (
                <Link
                  key={tag}
                  to="/skills"
                  search={{ tag: [tag] }}
                  className="border-border text-muted-foreground hover:border-foreground hover:text-foreground rounded-none border px-3 py-1.5 font-mono text-[10.5px] tracking-widest uppercase transition-colors"
                >
                  #{tag} · {tagCount}
                </Link>
              ),
            )}
          </div>
          {relatedTags.length > 30 && (
            <button
              type="button"
              onClick={() => setTagsExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground mt-3 font-mono text-[10px] tracking-[.16em] uppercase transition-colors"
            >
              {tagsExpanded
                ? String(categories_page_tags_show_fewer())
                : String(categories_page_tags_show_all({ count: relatedTags.length }))}
            </button>
          )}
        </section>
      )}

      {/* Top skills */}
      <CategoryTopSkills slug={slug} />

      {/* Other classifications */}
      <CategoryOtherClassifications currentSlug={slug} />
    </>
  );
}
