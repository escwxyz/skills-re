import { createFileRoute, notFound } from "@tanstack/react-router";

import { CategoriesStatsStrip } from "@/components/categories-stats-strip";
import { CategoryCard } from "@/components/category-card";
import { PageHero } from "@/components/page-hero";
import { getCategoriesList } from "@/functions/get-categories-list";
import { OG_CATEGORIES_IMAGE_PATH } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import {
  categories_index_description,
  categories_index_eyebrow,
  categories_index_note_body,
  categories_index_note_lead,
  categories_index_reading_body,
  categories_index_reading_heading,
  categories_index_title,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export const Route = createFileRoute("/_publicLayout/categories/")({
  loader: () => getCategoriesList(),
  head: () =>
    createSeo({
      canonicalPath: "/categories",
      image: OG_CATEGORIES_IMAGE_PATH,
      title: String(categories_index_title()),
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (!data) {
    throw notFound();
  }

  const { categories, skillsCount } = data;
  const locale = getLocale();
  const totalSkills = categories.reduce((sum, category) => sum + category.count, 0);

  return (
    <>
      <PageHero
        eyebrow={String(categories_index_eyebrow())}
        description={String(
          categories_index_description({ count: categories.length.toLocaleString(locale) }),
        )}
        aside={
          <div className="border-border text-muted-foreground mt-8 self-end border-t pt-6 font-mono text-[11px] leading-[1.7] md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-8">
            <span className="text-foreground mb-2 block tracking-[.16em] uppercase">
              {categories_index_reading_heading()}
            </span>
            {categories_index_reading_body({ total: totalSkills.toLocaleString(locale) })}
          </div>
        }
      >
        <em>{categories_index_title()}</em>
      </PageHero>

      <CategoriesStatsStrip categoriesCount={categories.length} skillsCount={skillsCount} />

      <section>
        <div className="border-border bg-border grid grid-cols-1 gap-px border-b-[3px] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((category, index) => (
            <CategoryCard key={category.slug} category={category} index={index} />
          ))}
        </div>
      </section>

      <div className="border-border text-muted-foreground border-b p-6 text-center font-mono text-[10.5px] tracking-widest uppercase">
        <b className="text-foreground font-medium">{categories_index_note_lead()}</b>{" "}
        {categories_index_note_body()}
      </div>
    </>
  );
}
