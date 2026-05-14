// oxlint-disable no-nested-ternary
import { useMemo } from "react";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";

import { TimeValue } from "@/components/time-value";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getDashboardPageData } from "@/functions/dashboard/get-dashboard-page-data";
import { createSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale, localizeHref } from "@/paraglide/runtime";

import type { DashboardPageData } from "@/functions/dashboard/get-dashboard-page-data";

export const Route = createFileRoute("/_authedLayout/dashboard/")({
  ssr: "data-only",
  loader: () => getDashboardPageData(),
  head: () =>
    createSeo({
      canonicalPath: "/dashboard",
      locale: getLocale(),
      noIndex: true,
      title: "Dashboard",
    }),
  component: RouteComponent,
});

type SkillItem = DashboardPageData["skills"][number];
type FeedbackItem = DashboardPageData["feedback"][number];
type ReviewItem = DashboardPageData["reviews"][number];
type SavedSkillItem = DashboardPageData["savedSkills"][number];

interface ActivityItem {
  date: number;
  href?: string;
  id: string;
  label: string;
}

// ---- OverviewMetricCard ----

function OverviewMetricCard({
  label,
  note,
  value,
}: {
  label: string;
  note: string;
  value: string;
}) {
  return (
    <Card size="sm" className="rounded-none border-rule/70 bg-background">
      <CardHeader className="border-b border-rule/60 pb-3">
        <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
          {label}
        </CardDescription>
        <CardTitle className="font-display text-[clamp(1.8rem,2.4vw,2.7rem)] leading-none tracking-[-0.04em]">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3 text-[12px] text-muted-text">{note}</CardContent>
    </Card>
  );
}

// ---- DashboardSection ----

function DashboardSection({
  actions,
  children,
  description,
  eyebrow,
  title,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-none border bg-paper shadow-[0_10px_40px_rgba(20,18,14,0.05)]">
      <header className="border-b border-rule/60 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
              {eyebrow}
            </div>
            <h2 className="mt-2 font-display text-[clamp(1.6rem,2.1vw,2.5rem)] leading-[0.96] tracking-[-0.03em] text-foreground">
              {title}
            </h2>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <p className="max-w-2xl pt-2 text-[13px] leading-[1.6] text-muted-text">{description}</p>
      </header>
      <div className="p-6 md:p-8">{children}</div>
    </section>
  );
}

// ---- OverviewMetrics ----

function OverviewMetrics({
  displayHandle,
  displayName,
  feedbackPending,
  feedbackTotal,
  reviewsTotal,
  savedSkills,
  skills,
}: {
  displayHandle: string;
  displayName: string;
  feedbackPending: number;
  feedbackTotal: number;
  reviewsTotal: number;
  savedSkills: SavedSkillItem[];
  skills: SkillItem[];
}) {
  const metrics = [
    {
      label: m.dashboard_overview_metric_published_skills(),
      note: m.dashboard_overview_metric_note_catalog(),
      value: String(skills.length),
    },
    {
      label: m.dashboard_overview_metric_saved_skills(),
      note: m.dashboard_overview_metric_note_library(),
      value: String(savedSkills.length),
    },
    {
      label: m.dashboard_overview_metric_reviews(),
      note: m.dashboard_overview_metric_note_reviews(),
      value: String(reviewsTotal),
    },
    {
      label: m.dashboard_overview_metric_feedback(),
      note:
        feedbackPending > 0
          ? m.dashboard_overview_metric_note_feedback_pending({ count: String(feedbackPending) })
          : m.dashboard_overview_metric_note_feedback_none(),
      value: String(feedbackTotal),
    },
  ];

  return (
    <DashboardSection
      eyebrow={m.dashboard_overview_eyebrow()}
      title={m.dashboard_overview_title({ name: displayName })}
      description={m.dashboard_overview_description({ handle: displayHandle })}
      actions={
        <>
          <a
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href={localizeHref("/dashboard/settings")}
          >
            {m.dashboard_overview_btn_settings()}
          </a>
          <a className={buttonVariants({ size: "sm" })} href={localizeHref("/dashboard/skills")}>
            {m.dashboard_overview_btn_skills()}
            <ArrowRightIcon />
          </a>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <OverviewMetricCard key={metric.label} {...metric} />
        ))}
      </div>
    </DashboardSection>
  );
}

// ---- OverviewActivity ----

function OverviewActivity({
  feedbacks,
  reviews,
  skills,
}: {
  feedbacks: FeedbackItem[];
  reviews: ReviewItem[];
  skills: SkillItem[];
}) {
  const locale = getLocale();

  const items = useMemo<ActivityItem[]>(() => {
    const all: ActivityItem[] = [
      ...skills.slice(0, 3).map((s) => ({
        date: s.createdAt ?? 0,
        href: `/skills/${s.slug}`,
        id: `skill-${s.id}`,
        label: m.dashboard_overview_activity_skill_published({ title: s.title }),
      })),
      ...reviews.slice(0, 3).map((r) => ({
        date: r.createdAt,
        href: `/skills/${r.skillSlug}`,
        id: `review-${r.id}`,
        label: m.dashboard_overview_activity_review_written({ skill: r.skillTitle }),
      })),
      ...feedbacks.slice(0, 3).map((f) => ({
        date: f._creationTime,
        id: `feedback-${f._id}`,
        label: m.dashboard_overview_activity_feedback_submitted({ title: f.title }),
      })),
    ];

    return all.toSorted((a, b) => b.date - a.date).slice(0, 5);
  }, [skills, reviews, feedbacks]);

  return (
    <DashboardSection
      eyebrow={m.dashboard_overview_activity_eyebrow()}
      title={m.dashboard_overview_activity_title()}
      description={m.dashboard_overview_activity_description()}
    >
      {items.length === 0 ? (
        <p className="text-[13px] text-muted-text">{m.dashboard_overview_activity_empty()}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id}>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center border border-rule bg-paper font-mono text-[10px] text-muted-text">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  {item.href ? (
                    <a
                      className="text-[13px] leading-[1.6] text-foreground/80 transition-colors hover:text-foreground"
                      href={localizeHref(item.href)}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <p className="text-[13px] leading-[1.6] text-foreground/80">{item.label}</p>
                  )}
                  <p className="text-[11px] text-muted-text">
                    <TimeValue locale={locale} time={item.date} />
                  </p>
                </div>
              </div>
              {index < items.length - 1 ? <Separator className="mt-3" /> : null}
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}

// ---- OverviewShortcuts ----

function OverviewShortcuts() {
  const shortcuts = [
    {
      description: m.dashboard_overview_shortcuts_skills_desc(),
      href: "/dashboard/skills",
      label: m.dashboard_overview_shortcuts_skills_label(),
    },
    {
      description: m.dashboard_overview_shortcuts_reviews_desc(),
      href: "/dashboard/reviews",
      label: m.dashboard_overview_shortcuts_reviews_label(),
    },
    {
      description: m.dashboard_overview_shortcuts_feedbacks_desc(),
      href: "/dashboard/feedbacks",
      label: m.dashboard_overview_shortcuts_feedbacks_label(),
    },
    {
      description: m.dashboard_overview_shortcuts_settings_desc(),
      href: "/dashboard/settings",
      label: m.dashboard_overview_shortcuts_settings_label(),
    },
  ];

  return (
    <Card className="rounded-none border-rule/80 bg-paper shadow-[0_10px_40px_rgba(20,18,14,0.05)]">
      <CardHeader className="border-b border-rule/60 pb-4">
        <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
          {m.dashboard_overview_shortcuts_eyebrow()}
        </CardDescription>
        <CardTitle className="mt-2 font-display text-[1.85rem] leading-[0.95] tracking-[-0.03em]">
          {m.dashboard_overview_shortcuts_title()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 py-4">
        {shortcuts.map((shortcut) => (
          <a
            key={shortcut.href}
            className="flex items-center justify-between gap-3 border border-rule/70 bg-background px-3 py-3 transition-colors hover:bg-primary hover:text-primary-foreground"
            href={localizeHref(shortcut.href)}
          >
            <div>
              <p className="font-display text-[18px] leading-none tracking-[-0.03em]">
                {shortcut.label}
              </p>
              <p className="mt-1 text-[12px] leading-normal text-muted-text">
                {shortcut.description}
              </p>
            </div>
            <ArrowRightIcon className="size-4 shrink-0 text-muted-text" />
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

// ---- Route component ----

function RouteComponent() {
  const data = Route.useLoaderData();
  const { currentUser } = useRouteContext({ from: "__root__" });

  if (!data || !currentUser) {
    return null;
  }

  const displayName = currentUser.name?.trim() || currentUser.email || "Dashboard";
  const displayHandle =
    (currentUser as { github?: string | null } | null)?.github ??
    currentUser?.email?.split("@")[0] ??
    currentUser?.id ??
    "dashboard";

  return (
    <div className="space-y-4 p-4 md:p-6">
      <OverviewMetrics
        displayHandle={displayHandle}
        displayName={displayName}
        feedbackPending={data.feedbackCount.pending}
        feedbackTotal={data.feedbackCount.total}
        reviewsTotal={data.reviewCount}
        savedSkills={data.savedSkills}
        skills={data.skills}
      />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <OverviewActivity feedbacks={data.feedback} reviews={data.reviews} skills={data.skills} />
        <OverviewShortcuts />
      </div>
    </div>
  );
}
