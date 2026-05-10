import type { DashboardMySkillsData } from "@/functions/dashboard/get-dashboard-my-skills";
import { getLocale } from "@/paraglide/runtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildSkillDetailPath } from "@/lib/skill-path";
import { formatDate } from "@/utils/format";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, CodeIcon } from "@phosphor-icons/react";
import { m } from "@/paraglide/messages";

export type SkillItem = DashboardMySkillsData["skills"][number];

export function DashboardSkillCard({ skill }: { skill: SkillItem }) {
  const locale = getLocale();
  const detailPath = buildSkillDetailPath({
    authorHandle: skill.authorHandle ?? "unknown",
    repoName: skill.repoName ?? "unknown-repo",
    skillSlug: skill.slug,
  });
  const updatedLabel = skill.updatedAt
    ? formatDate(skill.updatedAt, locale, { dateStyle: "medium" })
    : null;

  return (
    <Card className="rounded-none border bg-background">
      <CardHeader className="border-b pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
                {[skill.authorHandle, skill.repoName].filter(Boolean).join(" / ") || skill.slug}
              </span>
              {updatedLabel ? (
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-text/60">
                  {updatedLabel}
                </span>
              ) : null}
            </div>
            <CardTitle className="font-display text-[1.2rem] leading-none tracking-[-0.03em]">
              {skill.title}
            </CardTitle>
          </div>
          {skill.latestVersion ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 border bg-paper px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-text">
              <CodeIcon className="size-3" />
              {skill.latestVersion}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        <p className="line-clamp-3 text-[13px] leading-[1.6] text-foreground/80">
          {skill.description}
        </p>
        <div className="flex items-center justify-end">
          <Link
            className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-text transition-colors hover:text-foreground"
            to={detailPath}
          >
            {m.dashboard_skills_view_skill()} <ArrowRightIcon className="size-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
