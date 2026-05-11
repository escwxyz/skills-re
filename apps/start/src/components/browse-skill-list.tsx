"use client";

import { Link } from "@tanstack/react-router";

import { buildSkillDetailPath } from "@/lib/skill-path";
import { getLocale } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";
import { formatCompactNumber } from "@/utils/format";
import { getCategoryLabel } from "@/utils/category-data";
import type { BrowseSkillItem } from "@/utils/types";
import {
  getBrowseSkillAuthorHandle,
  getBrowseSkillAuthorLabel,
  getBrowseSkillUpdatedAtLabel,
} from "@/components/skill-card-browse";

interface Props {
  skills: BrowseSkillItem[];
}

export const BrowseSkillList = ({ skills }: Props) => {
  const locale = getLocale();

  return (
    <div className="divide-rule divide-y">
      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(10rem,0.85fr)_7rem_8rem_6rem_7rem] border-border border-b bg-muted/25 px-6 py-2.5 font-mono text-[10px] tracking-[.12em] uppercase text-muted-text">
        <span>Title</span>
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
          const updatedAtLabel = getBrowseSkillUpdatedAtLabel(skill, locale);
          const categoryLabel = getCategoryLabel(skill.primaryCategory ?? "other", locale);
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
              className="grid grid-cols-[minmax(0,1.25fr)_minmax(10rem,0.85fr)_7rem_8rem_6rem_7rem] items-center px-6 py-3 text-sm transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-ink">{skill.title}</div>
                <div className="mt-1 line-clamp-1 text-muted-text text-xs">{skill.description}</div>
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium text-ink">{authorLabel}</div>
                <div className="mt-1 truncate text-muted-text text-xs">{authorHandle}</div>
              </div>
              <div className="truncate text-muted-text text-xs">{categoryLabel}</div>
              <div className="truncate font-mono text-muted-text text-xs">{downloadsLabel}</div>
              <div className="truncate font-mono text-muted-text text-xs">{starsLabel}</div>
              <div className="truncate font-mono text-muted-text text-xs">{updatedAtLabel}</div>
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
