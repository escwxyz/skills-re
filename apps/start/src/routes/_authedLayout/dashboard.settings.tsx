import { createFileRoute, useRouteContext, Link } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { createSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { AgentAccessCard } from "@/components/agent-access-card";
import { IdentityLinksCard } from "@/components/identitty-links-card";
import { ApiKeysCard } from "@/components/api-keys-card";

export const Route = createFileRoute("/_authedLayout/dashboard/settings")({
  ssr: "data-only",
  head: () =>
    createSeo({
      canonicalPath: "/dashboard/settings",
      locale: getLocale(),
      noIndex: true,
      title: "Settings",
    }),
  component: SettingsRoute,
});

function SettingsRoute() {
  const { currentUser } = useRouteContext({ from: "/_authedLayout/dashboard" });

  if (!currentUser) {
    return null;
  }

  const displayHandle =
    (currentUser as { github?: string | null } | null)?.github ??
    currentUser?.email?.split("@")[0] ??
    currentUser?.id ??
    "dashboard";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="border bg-background p-6 shadow-[0_10px_40px_rgba(20,18,14,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-muted-foreground">
              {m.dashboard_settings_eyebrow()}
            </div>
            <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,4rem)] leading-[0.92] tracking-[-0.04em]">
              {m.dashboard_settings_title()}
            </h1>
            <p className="mt-4 max-w-2xl text-[13px] leading-[1.65] text-muted-foreground">
              {m.dashboard_settings_description({ handle: displayHandle })}
            </p>
          </div>
          <Link className={buttonVariants({ size: "sm", variant: "outline" })} to={"/dashboard"}>
            {m.dashboard_settings_back_to_overview()}
          </Link>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <IdentityLinksCard />
        <ApiKeysCard />
      </div>
      <AgentAccessCard />
    </div>
  );
}
