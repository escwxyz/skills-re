import { PageHero } from "@/components/page-hero";
import { SubmitSkillTabs } from "@/components/submit-skill-tabs";
import { m } from "@/paraglide/messages";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_publicLayout/submit")({
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
