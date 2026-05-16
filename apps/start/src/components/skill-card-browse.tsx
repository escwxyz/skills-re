import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@tanstack/react-router";

import { TimeValue } from "@/components/time-value";
import { getLocale } from "@/paraglide/runtime";
import { getCategoryTitle } from "@/utils/category-data";
import { formatCompactNumber } from "@/utils/format";
import type { BrowseSkillItem } from "@/utils/types";
import { StarIcon } from "@phosphor-icons/react";

interface Props {
  skill: BrowseSkillItem;
}

const hasStringProperty = (
  value: unknown,
  key: "handle" | "name",
): value is Record<typeof key, string> =>
  Boolean(
    value &&
    typeof value === "object" &&
    key in value &&
    typeof (value as Record<string, unknown>)[key] === "string",
  );

export const getBrowseSkillAuthorLabel = (skill: BrowseSkillItem) => {
  const { author } = skill;

  if (hasStringProperty(author, "name") && author.name.trim()) {
    return author.name;
  }

  if (skill.authorHandle) {
    return skill.authorHandle;
  }

  if (hasStringProperty(author, "handle") && author.handle.trim()) {
    return author.handle;
  }

  return "Unknown author";
};

export const getBrowseSkillAuthorHandle = (skill: BrowseSkillItem) => {
  if (skill.authorHandle) {
    return skill.authorHandle;
  }

  const { author } = skill;

  if (hasStringProperty(author, "handle") && author.handle.trim()) {
    return author.handle;
  }

  return "unknown-author";
};

export const SkillCardBrowse = ({ skill }: Props) => {
  const locale = getLocale();
  const authorLabel = getBrowseSkillAuthorLabel(skill);
  const authorHandle = getBrowseSkillAuthorHandle(skill);
  const authorAvatarUrl = skill.author?.avatarUrl;
  const categoryLabel = skill.primaryCategory
    ? getCategoryTitle(skill.primaryCategory, locale)
    : getCategoryTitle("other", locale);
  const starsLabel =
    typeof skill.stargazerCount === "number"
      ? formatCompactNumber(skill.stargazerCount, locale)
      : null;
  const auditScore = skill.staticAudit?.overallScore;
  const updatedAt = skill.updatedAt ?? skill.createdAt ?? null;
  const initial = (authorLabel ?? "?").charAt(0).toUpperCase();
  const tags = skill.tags ?? [];

  return (
    <div className="group flex h-full flex-col border-b border-r border-border p-5 transition-colors hover:bg-paper-2">
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] tracking-[.14em] uppercase">
        <Link
          to="/categories/$slug"
          params={{ slug: skill.primaryCategory ?? "other" }}
          className="text-muted-text"
        >
          <span className="text-muted-text">{categoryLabel}</span>
        </Link>

        <span className="text-muted-text">
          {updatedAt ? <TimeValue locale={locale} time={updatedAt} /> : "—"}
        </span>
      </div>

      <Link
        params={{
          author: authorHandle,
          repo: skill.repoName ?? "unknown-repo",
          slug: skill.slug,
        }}
        to="/skills/$author/$repo/$slug"
        className="block no-underline hover:no-underline"
      >
        <h3 className="font-display mb-2 text-[22px] font-normal leading-[1.1]">{skill.title}</h3>
        <p className="text-ink-2 mb-4 line-clamp-3 font-serif text-[13px] leading-normal">
          {skill.description}
        </p>
      </Link>

      <div className="mb-4 mt-auto flex flex-wrap gap-1">
        {tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="border-border text-muted-text border px-1.5 py-0.5 font-mono text-[9px] tracking-[.08em] uppercase"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Link
            aria-label={`View ${authorLabel || "author"} profile`}
            params={{ handle: authorHandle }}
            to="/authors/$handle"
            className="no-underline transition-transform hover:scale-105 hover:no-underline"
          >
            <Avatar className="size-5 rounded-none border-0 bg-background shadow-none after:rounded-none">
              {authorAvatarUrl ? (
                <AvatarImage
                  className="rounded-none object-cover"
                  alt={authorLabel}
                  src={authorAvatarUrl}
                />
              ) : null}
              <AvatarFallback className="rounded-none bg-ink font-mono text-[9px] text-paper">
                {initial}
              </AvatarFallback>
            </Avatar>
          </Link>
          <span className="text-muted-text max-w-30 truncate font-mono text-[10px]">
            {authorLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] tracking-widest uppercase">
          {starsLabel ? (
            <span className="text-muted-text flex items-center gap-1">
              <StarIcon /> <b className="text-ink font-medium">{starsLabel}</b>
            </span>
          ) : null}
          {typeof auditScore === "number" ? (
            <span className="text-muted-text">
              Audit <b className="text-ink font-medium">{auditScore}</b>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
