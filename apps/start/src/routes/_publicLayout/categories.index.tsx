import { createFileRoute, notFound } from "@tanstack/react-router";

import { CategoryCard } from "@/components/category-card";
import { PageHero } from "@/components/page-hero";
import { getCategoriesList } from "@/functions/categories/get-categories-list";
import { createSeo } from "@/lib/seo";
import { formatInteger } from "@/utils/format";
import { sumDailyMetrics } from "@/utils/stats";
import {
  categories_index_description,
  categories_index_eyebrow,
  categories_index_note_body,
  categories_index_note_lead,
  categories_index_reading_body,
  categories_index_reading_heading,
  categories_index_stat_disciplines,
  categories_index_stat_listed_authors,
  categories_index_stat_new_skills,
  categories_index_stat_skills_indexed,
  categories_index_title,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_publicLayout/categories/")({
  loader: () => getCategoriesList({ data: {} }),
  head: () =>
    createSeo({
      canonicalPath: "/categories",
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

  const { categories, authorsCount, dailyMetrics, skillsCount } = data;
  const locale = getLocale();
  const totals = sumDailyMetrics(dailyMetrics);
  const totalSkills = categories.reduce((sum, category) => sum + category.count, 0);

  const statStrip = [
    {
      label: String(categories_index_stat_disciplines()),
      value: formatInteger(categories.length, locale),
    },
    {
      label: String(categories_index_stat_skills_indexed()),
      value: formatInteger(skillsCount, locale),
    },
    {
      label: String(categories_index_stat_listed_authors()),
      value: formatInteger(authorsCount, locale),
    },
    {
      label: String(categories_index_stat_new_skills()),
      value: formatInteger(totals.newSkills, locale),
    },
  ];

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

      <div className="border-border grid grid-cols-2 border-b-[3px] font-mono text-[10.5px] tracking-widest uppercase md:grid-cols-4">
        {statStrip.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "border-border border-r px-5 py-4.5",
              i === statStrip.length - 1 ? " border-r-0" : "",
            )}
          >
            <div className="text-muted-foreground">{s.label}</div>
            <div className="font-display mt-1 text-[36px] leading-none font-normal">{s.value}</div>
          </div>
        ))}
      </div>

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
