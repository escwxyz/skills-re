import { createFileRoute, Link } from "@tanstack/react-router";

import { getHomePageData } from "@/functions/get-home-page-data";
import { createSeo } from "@/lib/seo";
import { getLocale } from "@/paraglide/runtime";
import { Nameplate } from "@/components/nameplate";
import { HomeHero } from "@/components/home-hero";
import { TerminalPanel } from "@/components/terminal-panel";
import { m } from "@/paraglide/messages";
import { CategoryCard } from "@/components/category-card";
import { FeaturedPicks } from "@/components/featured-picks";
import { BlogSection } from "@/components/blog-section";
import { HowItWorks } from "@/components/how-it-works";

export const Route = createFileRoute("/_publicLayout/")({
  loader: () => getHomePageData({ data: {} }),
  head: () =>
    createSeo({
      canonicalPath: "/",
      // i18n
      title: "The Registry of Agent Skills",
      locale: getLocale(),
    }),
  component: App,
});

function App() {
  const data = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-360 px-6 pb-15">
      <Nameplate />
      <HomeHero />
      <TerminalPanel />

      <section>
        <div className="section-title">
          <h3>{m.home_hero_skill_categories()}</h3>
          <div className="eyebrow">
            § browse by category - <Link to="/categories">{m.home_hero_view_all()}</Link>
          </div>
        </div>
        <div className="border-border bg-border grid grid-cols-1 gap-px border-b-[3px] sm:grid-cols-2 md:grid-cols-4">
          {data.categories.map((category, index) => (
            <CategoryCard key={category.slug} category={category} index={index} />
          ))}
        </div>
      </section>

      {data.featuredPicks.length > 0 ? <FeaturedPicks picks={data.featuredPicks} /> : null}
      <BlogSection />
      <HowItWorks />
    </div>
  );
}
