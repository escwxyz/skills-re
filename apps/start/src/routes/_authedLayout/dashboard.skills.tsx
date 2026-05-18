import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { CodeIcon } from "@phosphor-icons/react";

import { m } from "@/paraglide/messages";
import { getDashboardMySkills } from "@/functions/dashboard/get-dashboard-my-skills";
import { DashboardSkillCard } from "@/components/dashboard-skill-card";
import { createSeo } from "@/lib/seo";
import { getLocale } from "@/paraglide/runtime";

export const Route = createFileRoute("/_authedLayout/dashboard/skills")({
  loader: async () => await getDashboardMySkills(),
  ssr: "data-only",
  component: RouteComponent,
  head: () =>
    createSeo({
      canonicalPath: "/dashboard/skills",
      locale: getLocale(),
      noIndex: true,
      title: "My Skills",
    }),
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const { currentUser } = useRouteContext({ from: "/_authedLayout/dashboard" });

  if (!data || !currentUser) {
    return null;
  }

  const displayHandle =
    (currentUser as { github?: string | null } | null)?.github ??
    currentUser?.email?.split("@")[0] ??
    currentUser?.id ??
    "dashboard";

  return (
    <section className="p-4 md:p-6">
      <div className="mb-1 font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
        {m.dashboard_skills_published_eyebrow()}
      </div>
      <h2 className="font-display text-[1.6rem] leading-[0.96] tracking-[-0.03em]">
        {m.dashboard_skills_published_title()}
      </h2>
      <p className="mt-2 text-[13px] leading-[1.6] text-muted-foreground">
        {m.dashboard_skills_published_description({ handle: displayHandle })}
      </p>

      <div className="mt-6">
        {data.skills.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.skills.map((skill) => (
              <DashboardSkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border bg-background px-5 py-12 text-center">
            <CodeIcon className="mx-auto size-7 text-muted-foreground/60" />
            <p className="mt-4 font-display text-[1.35rem] leading-none tracking-[-0.03em] text-foreground">
              {m.dashboard_skills_no_published_title()}
            </p>
            <p className="mx-auto mt-3 max-w-md text-[13px] leading-[1.6] text-muted-foreground">
              {m.dashboard_skills_no_published_description()}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
