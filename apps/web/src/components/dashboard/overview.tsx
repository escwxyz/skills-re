// oxlint-disable unicorn/no-nested-ternary
"use client";

import { useMemo } from "react";

import { ArrowRightIcon } from "@phosphor-icons/react";

import { m } from "@/paraglide/messages";
import { getLocale, localizeHref } from "@/paraglide/runtime";
import { formatDateTime } from "@/lib/utils";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type { CurrentUser, DashboardFeedbackItem, ReviewItem, SkillItem } from "./shared";
import { DashboardSection } from "./shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  date: number;
  href?: string;
  id: string;
  label: string;
}

export interface OverviewProps {
  currentUser?: CurrentUser | null;
  feedbackPending?: number;
  feedbackTotal?: number;
  feedbacks?: DashboardFeedbackItem[];
  isLoading?: boolean;
  reviews?: ReviewItem[];
  reviewsTotal?: number;
  savedSkills?: SkillItem[];
  skills?: SkillItem[];
}

// ─── OverviewMetricCard ───────────────────────────────────────────────────────

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
        <CardTitle className="font-serif text-[clamp(1.8rem,2.4vw,2.7rem)] leading-none tracking-[-0.04em]">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3 text-[12px] text-muted-text">{note}</CardContent>
    </Card>
  );
}

// ─── OverviewMetrics ──────────────────────────────────────────────────────────

interface OverviewMetricsProps {
  displayHandle: string;
  displayName: string;
  feedbackPending: number;
  feedbackTotal: number;
  isLoading: boolean;
  reviewsTotal: number;
  savedSkills: SkillItem[];
  skills: SkillItem[];
}

function OverviewMetrics({
  displayHandle,
  displayName,
  feedbackPending,
  feedbackTotal,
  isLoading,
  reviewsTotal,
  savedSkills,
  skills,
}: OverviewMetricsProps) {
  const dash = isLoading ? "—" : undefined;

  const metrics = [
    {
      label: m.dashboard_overview_metric_published_skills(),
      value: dash ?? String(skills.length),
      note: m.dashboard_overview_metric_note_catalog(),
    },
    {
      label: m.dashboard_overview_metric_saved_skills(),
      value: dash ?? String(savedSkills.length),
      note: m.dashboard_overview_metric_note_library(),
    },
    {
      label: m.dashboard_overview_metric_reviews(),
      value: dash ?? String(reviewsTotal),
      note: m.dashboard_overview_metric_note_reviews(),
    },
    {
      label: m.dashboard_overview_metric_feedback(),
      value: dash ?? String(feedbackTotal),
      note:
        !isLoading && feedbackPending > 0
          ? m.dashboard_overview_metric_note_feedback_pending({ count: String(feedbackPending) })
          : m.dashboard_overview_metric_note_feedback_none(),
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
            <span>{m.dashboard_overview_btn_skills()}</span>
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

// ─── OverviewActivity ─────────────────────────────────────────────────────────

interface OverviewActivityProps {
  feedbacks: DashboardFeedbackItem[];
  isLoading: boolean;
  reviews: ReviewItem[];
  skills: SkillItem[];
}

function OverviewActivity({ feedbacks, isLoading, reviews, skills }: OverviewActivityProps) {
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
      {isLoading ? (
        <p className="text-[13px] text-muted-text">{m.dashboard_overview_loading()}</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-muted-text">{m.dashboard_overview_activity_empty()}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id}>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center border border-rule bg-paper text-[10px] font-mono text-muted-text">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  {item.href ? (
                    <a
                      href={localizeHref(item.href)}
                      className="text-[13px] leading-[1.6] text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <p className="text-[13px] leading-[1.6] text-foreground/80">{item.label}</p>
                  )}
                  <p className="text-[11px] text-muted-text">{formatDateTime(item.date, locale)}</p>
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

// ─── OverviewShortcuts ────────────────────────────────────────────────────────

function OverviewShortcuts() {
  const shortcuts = [
    {
      href: "/dashboard/skills",
      label: m.dashboard_overview_shortcuts_skills_label(),
      description: m.dashboard_overview_shortcuts_skills_desc(),
    },
    {
      href: "/dashboard/reviews",
      label: m.dashboard_overview_shortcuts_reviews_label(),
      description: m.dashboard_overview_shortcuts_reviews_desc(),
    },
    {
      href: "/dashboard/feedbacks",
      label: m.dashboard_overview_shortcuts_feedbacks_label(),
      description: m.dashboard_overview_shortcuts_feedbacks_desc(),
    },
    {
      href: "/dashboard/settings",
      label: m.dashboard_overview_shortcuts_settings_label(),
      description: m.dashboard_overview_shortcuts_settings_desc(),
    },
  ];

  return (
    <Card className="rounded-none border-rule/80 bg-paper shadow-[0_10px_40px_rgba(20,18,14,0.05)]">
      <CardHeader className="border-b border-rule/60 pb-4">
        <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
          {m.dashboard_overview_shortcuts_eyebrow()}
        </CardDescription>
        <CardTitle className="mt-2 font-serif text-[1.85rem] leading-[0.95] tracking-[-0.03em]">
          {m.dashboard_overview_shortcuts_title()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 py-4">
        {shortcuts.map((shortcut) => (
          <a
            key={shortcut.href}
            href={localizeHref(shortcut.href)}
            className="flex items-center justify-between gap-3 border border-rule/70 bg-background px-3 py-3 transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <div>
              <p className="font-serif text-[18px] leading-none tracking-[-0.03em]">
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

// ─── DashboardOverview (composer) ─────────────────────────────────────────────

export function DashboardOverview({
  currentUser,
  feedbackPending = 0,
  feedbackTotal = 0,
  feedbacks = [],
  isLoading = false,
  reviews = [],
  reviewsTotal = 0,
  savedSkills = [],
  skills = [],
}: OverviewProps) {
  const displayName = currentUser?.name ?? "Guest";
  const displayHandle =
    currentUser?.github ?? currentUser?.email?.split("@")[0] ?? currentUser?.id ?? "dashboard";

  return (
    <div className="space-y-4">
      <OverviewMetrics
        displayHandle={displayHandle}
        displayName={displayName}
        feedbackPending={feedbackPending}
        feedbackTotal={feedbackTotal}
        isLoading={isLoading}
        reviewsTotal={reviewsTotal}
        savedSkills={savedSkills}
        skills={skills}
      />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <OverviewActivity
          feedbacks={feedbacks}
          isLoading={isLoading}
          reviews={reviews}
          skills={skills}
        />
        <OverviewShortcuts />
      </div>
    </div>
  );
}
