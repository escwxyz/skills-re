import { PageHero } from "@/components/page-hero";
import { SubmitSkillTabs } from "@/components/submit-skill-tabs";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { createSeo } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_publicLayout/submit")({
  head: () =>
    createSeo({
      canonicalPath: "/submit",
      description: m.submit_meta_description(),
      title: m.submit_meta_title(),
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <PageHero
        eyebrow={m.submit_hero_eyebrow({})}
        description={m.submit_hero_description({})}
        descriptionItalic
      >
        {m.submit_hero_title({})}
      </PageHero>
      <SubmitSkillTabs />
    </>
  );
}
