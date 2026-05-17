"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TimeValue } from "@/components/time-value";
import { Link } from "@tanstack/react-router";

import { buildSkillDetailPath } from "@/lib/skill-path";
import { getLocale } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";
import { formatCompactNumber } from "@/utils/format";
import { getCategoryTitle } from "@/utils/category-data";
import type { BrowseSkillItem } from "@/utils/types";
import {
  getBrowseSkillAuthorHandle,
  getBrowseSkillAuthorLabel,
} from "@/components/skill-card-browse";

interface Props {
  skills: BrowseSkillItem[];
}

export const BrowseSkillList = ({ skills }: Props) => {
  const locale = getLocale();

  const colsCls = "grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)_8rem_6rem_6rem_5rem_7rem]";

  return (
    <div className="divide-rule divide-y">
      <div
        className={`grid border-border border-b bg-muted/25 px-6 py-2.5 font-mono text-[10px] tracking-[.12em] uppercase text-muted-text ${colsCls}`}
      >
        <span>Title</span>
        <span>Description</span>
        <span>{m.skill_detail_meta_author()}</span>
        <span>{m.skill_detail_meta_category()}</span>
        <span>{m.skill_detail_metric_installs()}</span>
        <span>{m.skill_detail_metric_stars()}</span>
        <span>{m.skill_detail_meta_updated()}</span>
      </div>

      {skills.length > 0 ? (
        skills.map((skill) => {
          const authorLabel = getBrowseSkillAuthorLabel(skill);
          const authorHandle = getBrowseSkillAuthorHandle(skill);
          const authorAvatarUrl = skill.author?.avatarUrl;
          const authorInitial = (authorLabel ?? "?").charAt(0).toUpperCase();
          const updatedAt = skill.updatedAt ?? skill.createdAt ?? null;
          const categoryLabel = getCategoryTitle(skill.primaryCategory ?? "other", locale);
          const downloadsLabel = formatCompactNumber(skill.downloadsAllTime ?? 0, locale);
          const starsLabel =
            typeof skill.stargazerCount === "number"
              ? formatCompactNumber(skill.stargazerCount, locale)
              : "—";

          return (
            <Link
              key={skill.id}
              to={buildSkillDetailPath({
                authorHandle: skill.authorHandle ?? authorHandle,
                repoName: skill.repoName ?? "unknown-repo",
                skillSlug: skill.slug,
              })}
              className={`grid items-center px-6 py-3.5 transition-colors hover:bg-muted/40 ${colsCls}`}
            >
              <div className="min-w-0 pr-4">
                <div className="truncate font-display font-semibold text-sm text-ink">
                  {skill.title}
                </div>
              </div>
              <div className="min-w-0 pr-6">
                <div className="truncate text-xs text-muted-text">{skill.description}</div>
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                <Avatar className="size-4 shrink-0 rounded-none border-0 bg-background shadow-none after:rounded-none">
                  {authorAvatarUrl ? (
                    <AvatarImage
                      className="rounded-none object-cover"
                      alt={authorLabel}
                      src={authorAvatarUrl}
                    />
                  ) : null}
                  <AvatarFallback className="rounded-none bg-ink font-mono text-[8px] text-paper">
                    {authorInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-muted-text">{authorHandle}</span>
              </div>
              <div className="truncate text-muted-text text-xs">{categoryLabel}</div>
              <div className="truncate font-mono text-muted-text text-xs">{downloadsLabel}</div>
              <div className="truncate font-mono text-muted-text text-xs">{starsLabel}</div>
              <div className="truncate font-mono text-muted-text text-xs">
                {updatedAt ? <TimeValue locale={locale} time={updatedAt} /> : "—"}
              </div>
            </Link>
          );
        })
      ) : (
        <div className="px-6 py-12 text-center font-mono text-[11px] tracking-[.14em] uppercase text-muted-text">
          {m.skills_browse_no_matches()}
        </div>
      )}
    </div>
  );
};
