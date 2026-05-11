import { skill_card_metric_audit } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getCategoryTitle } from "@/utils/category-data";
import { formatCompactNumber } from "@/utils/format";
import type { BrowseSkillItem } from "@/utils/types";

import { Link } from "@tanstack/react-router";

const getAuthorInitial = (authorLabel?: string | null) => {
  const initial = (authorLabel ?? "").trim().charAt(0).toUpperCase();
  return initial || "?";
};

interface Props {
  skill: BrowseSkillItem;
  hideAuthorName?: boolean;
}

export const SkillCard = ({ skill, hideAuthorName = true }: Props) => {
  const locale = getLocale();
  const authorLabel =
    skill.author?.name ?? skill.authorHandle ?? skill.author?.handle ?? "Community";
  const authorHandle = skill.authorHandle ?? skill.author?.handle ?? "unknown-author";
  const initial = getAuthorInitial(authorLabel);
  const categoryLabel = getCategoryTitle(skill.primaryCategory ?? "other", locale);
  const badgeLabel = skill.latestVersion ? `v${skill.latestVersion}` : undefined;
  const starsLabel =
    typeof skill.stargazerCount === "number"
      ? formatCompactNumber(skill.stargazerCount, locale)
      : undefined;

  return (
    <Link
      to="/skills/$author/$repo/$slug"
      params={{
        author: authorHandle,
        repo: skill.repoName ?? "unknown-repo",
        slug: skill.slug,
      }}
      className="border-border hover:bg-muted flex h-full flex-col border-b border-r p-5 transition-colors"
    >
      <div className="text-muted-foreground mb-3 flex items-center justify-between font-mono text-[10px] tracking-[.14em] uppercase">
        <span>{categoryLabel}</span>
        {badgeLabel ? <span>{badgeLabel}</span> : null}
      </div>

      <h4 className="font-display mb-2 text-[22px] leading-[1.1] font-normal">{skill.title}</h4>

      <p className="text-muted-foreground mb-4 line-clamp-3 font-serif text-[13px] leading-normal">
        {skill.description}
      </p>

      <div className="mb-4 mt-auto flex flex-wrap gap-1">
        {(skill.tags ?? []).slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="border-border text-muted-foreground border px-1.5 py-0.5 font-mono text-[9px] tracking-[.08em] uppercase"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="border-border flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-2">
          <div className="bg-foreground text-background flex size-5 shrink-0 items-center justify-center font-mono text-[9px]">
            {initial}
          </div>
          {hideAuthorName ? null : (
            <span className="text-muted-foreground max-w-30 truncate font-mono text-[10px]">
              {authorLabel}
            </span>
          )}
        </div>
        <div className="text-muted-foreground flex shrink-0 items-center gap-3 font-mono text-[10px] tracking-widest uppercase">
          {starsLabel ? (
            <span>
              ★ <b className="text-foreground font-medium">{starsLabel}</b>
            </span>
          ) : null}
          {typeof skill.staticAudit?.overallScore === "number" ? (
            <span>
              {skill_card_metric_audit()}{" "}
              <b className="text-foreground font-medium">{skill.staticAudit.overallScore}</b>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
};
