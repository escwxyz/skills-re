"use client";

import {
  ArrowRightIcon,
  BookmarkSimpleIcon,
  CodeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import { m } from "@/paraglide/messages";
import { getLocale, localizeHref } from "@/paraglide/runtime";
import { formatDateTime } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type { CurrentUser } from "./shared";
import { DashboardSection } from "./shared";

interface SkillItem {
  authorHandle?: string;
  createdAt?: number;
  description: string;
  id: string;
  latestVersion?: string;
  repoName?: string;
  slug: string;
  tags?: string[];
  title: string;
  updatedAt?: number;
}

interface Props {
  currentUser?: CurrentUser | null;
  isLoading?: boolean;
  skills: SkillItem[];
  skillsError?: string | null;
  savedSkills: SkillItem[];
  savedSkillsError?: string | null;
  savedSkillsLoading?: boolean;
}

function SkillCard({ skill }: { skill: SkillItem }) {
  const locale = getLocale();
  const skillHref = localizeHref(`/skills/${skill.slug}`);

  return (
    <Card className="rounded-none border-rule/70 bg-background">
      <CardHeader className="border-b border-rule/60 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardDescription className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-text">
                {skill.slug}
              </CardDescription>
              {skill.updatedAt ? (
                <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
                  {formatDateTime(skill.updatedAt, locale)}
                </span>
              ) : null}
            </div>
            <CardTitle className="font-serif text-[1.35rem] leading-none tracking-[-0.03em]">
              {skill.title}
            </CardTitle>
            {skill.authorHandle || skill.repoName ? (
              <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
                {[skill.authorHandle, skill.repoName].filter(Boolean).join(" / ")}
              </p>
            ) : null}
          </div>
          {skill.latestVersion ? (
            <span className="inline-flex items-center gap-1.5 border border-rule bg-paper px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
              <CodeIcon className="size-3" />
              {skill.latestVersion}
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 py-3">
        <p className="text-[13px] leading-[1.6] text-foreground/80">{skill.description}</p>
        {skill.tags && skill.tags.length > 0 ? (
          <>
            <Separator />
            <div className="flex flex-wrap gap-1.5">
              {skill.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="border border-rule/70 bg-[#f6f0e5] px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-text"
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        ) : null}
        <div className="flex">
          <a
            className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text transition-colors hover:text-foreground"
            href={skillHref}
          >
            {m.dashboard_skills_view_skill()}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardSkills({
  currentUser,
  isLoading,
  savedSkills,
  savedSkillsError,
  savedSkillsLoading,
  skills,
  skillsError,
}: Props) {
  const displayHandle =
    currentUser?.github ?? currentUser?.email?.split("@")[0] ?? currentUser?.id ?? "dashboard";

  let publishedBody = (
    <div className="border border-dashed border-rule bg-background px-5 py-10 text-center">
      <CodeIcon className="mx-auto size-8 text-muted-text" />
      <p className="mt-4 font-serif text-[1.4rem] leading-none tracking-[-0.03em] text-foreground">
        {m.dashboard_skills_no_published_title()}
      </p>
      <p className="mx-auto mt-3 max-w-lg text-[13px] leading-[1.6] text-muted-text">
        {m.dashboard_skills_no_published_description()}
      </p>
    </div>
  );

  if (isLoading) {
    publishedBody = (
      <div className="border border-dashed border-rule bg-background px-5 py-10 text-center">
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
          {m.dashboard_skills_loading()}
        </p>
      </div>
    );
  } else if (skillsError) {
    publishedBody = (
      <div className="border border-dashed border-destructive/40 bg-background px-5 py-10 text-center">
        <WarningCircleIcon className="mx-auto size-8 text-destructive" />
        <p className="mt-4 font-serif text-[1.4rem] leading-none tracking-[-0.03em] text-foreground">
          {m.dashboard_skills_failed()}
        </p>
        <p className="mx-auto mt-3 max-w-lg text-[13px] leading-[1.6] text-muted-text">
          {m.dashboard_skills_failed_description()}
        </p>
      </div>
    );
  } else if (skills.length > 0) {
    publishedBody = (
      <>
        {skills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </>
    );
  }

  let savedBody = (
    <div className="border border-dashed border-rule bg-background px-5 py-10 text-center">
      <BookmarkSimpleIcon className="mx-auto size-8 text-muted-text" />
      <p className="mt-4 font-serif text-[1.4rem] leading-none tracking-[-0.03em] text-foreground">
        {m.dashboard_skills_saved_coming_soon()}
      </p>
      <p className="mx-auto mt-3 max-w-lg text-[13px] leading-[1.6] text-muted-text">
        {m.dashboard_skills_saved_description_body()}
      </p>
    </div>
  );

  if (savedSkillsLoading) {
    savedBody = (
      <div className="border border-dashed border-rule bg-background px-5 py-10 text-center">
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
          {m.dashboard_skills_loading()}
        </p>
      </div>
    );
  } else if (savedSkillsError) {
    savedBody = (
      <div className="border border-dashed border-destructive/40 bg-background px-5 py-10 text-center">
        <WarningCircleIcon className="mx-auto size-8 text-destructive" />
        <p className="mt-4 font-serif text-[1.4rem] leading-none tracking-[-0.03em] text-foreground">
          {m.dashboard_skills_failed()}
        </p>
        <p className="mx-auto mt-3 max-w-lg text-[13px] leading-[1.6] text-muted-text">
          {m.dashboard_skills_failed_description()}
        </p>
      </div>
    );
  } else if (savedSkills.length > 0) {
    savedBody = (
      <div className="space-y-3">
        {savedSkills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DashboardSection
        eyebrow={m.dashboard_skills_published_eyebrow()}
        title={m.dashboard_skills_published_title()}
        description={m.dashboard_skills_published_description({ handle: displayHandle })}
        actions={
          <a
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href={localizeHref("/skills")}
          >
            {m.dashboard_skills_browse_catalog()}
            <ArrowRightIcon />
          </a>
        }
      >
        <div className="space-y-3">{publishedBody}</div>
      </DashboardSection>

      <DashboardSection
        eyebrow={m.dashboard_skills_saved_eyebrow()}
        title={m.dashboard_skills_saved_title()}
        description={m.dashboard_skills_saved_description({ handle: displayHandle })}
      >
        {savedBody}
      </DashboardSection>
    </div>
  );
}
