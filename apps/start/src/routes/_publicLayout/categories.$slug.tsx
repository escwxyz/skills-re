import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { PageHero } from "@/components/page-hero";
import { SkillCard } from "@/components/skill-card";
import { getCategoryDetail } from "@/functions/categories/get-category-detail";
import { createSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import {
  getCategoryDescription,
  getCategoryLabel,
  getCategoryPresentation,
} from "@/utils/category-data";
import {
  categories_page_breadcrumb,
  categories_page_eyebrow,
  categories_page_no_skills_yet,
  categories_page_other_classifications,
  categories_page_related_tags,
  categories_page_see_all_skills,
  categories_page_skills_in_this_classification,
  categories_page_skills_indexed,
  categories_page_title,
  categories_page_top_skills,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { TITLE_VARIANT_CLASS } from "@/components/category-card";

export const Route = createFileRoute("/_publicLayout/categories/$slug")({
  loader: ({ params }) => getCategoryDetail({ data: { slug: params.slug } }),
  head: ({ loaderData }) =>
    createSeo({
      canonicalPath: loaderData ? `/categories/${loaderData.slug}` : "/categories",
      description: loaderData ? getCategoryDescription(loaderData.slug, getLocale()) : undefined,
      title: loaderData
        ? `${getCategoryLabel(loaderData.slug, getLocale())} — ${String(categories_page_title())}`
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

  const { categories, categoryDetail, slug } = data;
  const locale = getLocale();
  const currentIndex = categories.findIndex((category) => category.slug === slug);
  const presentation = getCategoryPresentation(
    slug,
    currentIndex === -1 ? undefined : currentIndex,
    locale,
  );
  const titleVariantClass = TITLE_VARIANT_CLASS[presentation.variant ?? "default"] ?? "";
  const title = getCategoryLabel(slug, locale);
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
              <b className="text-foreground font-medium">
                {categoryDetail.count.toLocaleString(locale)}
              </b>
            </div>
            <div>
              {categories_page_related_tags()}{" "}
              <b className="text-editorial-green font-medium">
                {categoryDetail.relatedTags.length.toLocaleString(locale)}
              </b>
            </div>
          </div>
        }
      >
        <span className={cn(titleVariantClass)}>{title}</span>
      </PageHero>

      {/* Related tags */}
      {categoryDetail.relatedTags.length > 0 && (
        <section className="border-border border-b px-6 py-6">
          <div className="text-muted-foreground mb-3 font-mono text-[10px] tracking-[.16em] uppercase">
            {categories_page_related_tags()}
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryDetail.relatedTags.map(({ slug: tag, count }) => (
              <Link
                key={tag}
                to="/skills"
                search={{
                  tag: [tag],
                }}
                className="border-border text-muted-foreground hover:border-foreground hover:text-foreground rounded-none border px-3 py-1.5 font-mono text-[10.5px] tracking-widest uppercase transition-colors"
              >
                #{tag} · {count}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top skills */}
      <section className="border-border border-b px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-muted-foreground font-mono text-[11px] tracking-[.16em] uppercase">
              {categories_page_top_skills()}
            </div>
            <div className="text-muted-foreground mt-1 font-mono text-[10.5px] tracking-[.12em] uppercase">
              {categories_page_skills_in_this_classification({
                count: categoryDetail.count.toLocaleString(locale),
              })}
            </div>
          </div>
          <Link
            to="/skills"
            search={{ category: slug }}
            className="border-border text-muted-foreground hover:text-foreground rounded-none border px-4 py-2 font-mono text-[10px] tracking-[.14em] uppercase transition-colors"
          >
            {categories_page_see_all_skills()}
          </Link>
        </div>

        {categoryDetail.topSkills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {categoryDetail.topSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="border-border text-muted-foreground border px-6 py-10 font-mono text-sm">
            {categories_page_no_skills_yet()}
          </div>
        )}
      </section>

      {/* Other classifications */}
      <section className="border-border border-b px-6 py-8">
        <div className="text-muted-foreground mb-4 font-mono text-[10px] tracking-[.16em] uppercase">
          {categories_page_other_classifications()}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {categories
            .filter((category) => category.slug !== slug)
            .map((cat, index) => (
              <Link
                key={cat.slug}
                to="/categories/$slug"
                params={{ slug: cat.slug }}
                className="text-muted-foreground hover:text-foreground font-mono text-[10.5px] tracking-widest uppercase transition-colors"
              >
                {getCategoryPresentation(cat.slug, index, locale).num}{" "}
                {getCategoryLabel(cat.slug, locale)}
              </Link>
            ))}
        </div>
      </section>
    </>
  );
}
