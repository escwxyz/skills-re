import { m } from "@/paraglide/messages";
import { Link } from "@tanstack/react-router";

import { SkillSlugSwitcher } from "@/components/skill-slug-switcher";
import { cn } from "@/lib/utils";

interface Props {
  skill: {
    authorHandle: string;
    id: string;
    repoName: string;
    slug: string;
  };
}

export const SkillBreadcrumb = ({ skill }: Props) => (
  <div className="mb-8 flex min-w-0 items-center gap-1.5 overflow-hidden font-mono text-[10.5px] uppercase tracking-widest sm:gap-2 sm:text-xs">
    <Link to="/skills" className="text-muted-text shrink-0 transition-colors hover:text-primary">
      {m.skill_breadcrumb_root({})}
    </Link>
    <span className="shrink-0">/</span>
    <Link
      to="/authors/$handle"
      params={{ handle: skill.authorHandle }}
      className="text-muted-text min-w-0 max-w-[34vw] truncate transition-colors hover:text-primary sm:max-w-[16rem]"
    >
      {skill.authorHandle}
    </Link>
    <span className="shrink-0">/</span>
    <div className={cn("min-w-0 flex-1", "max-w-full")}>
      <SkillSlugSwitcher
        authorHandle={skill.authorHandle}
        repo={skill.repoName}
        className="w-full max-w-full"
        currentSlug={skill.slug}
      />
    </div>

    {/* <div className="ml-auto flex items-center gap-3">
      {skill.tags.length > 0 && (
        <span className="text-muted-text hidden items-center gap-1 sm:flex">
          {skill.tags.map((tag, i) => (
            <span key={tag} className="flex items-center gap-1">
              {i > 0 && <span>·</span>}
              <Link
                to="/tags/$slug"
                params={{ slug: tag }}
                className="transition-colors hover:text-primary"
              >
                {tag}
              </Link>
            </span>
          ))}
        </span>
      )}
      <Link
        to="/categories/$slug"
        params={{ slug: skill.categorySlug }}
        className="transition-colors hover:text-primary"
      >
        <span className="text-muted-text">{skill.categoryLabel}</span>
      </Link>
    </div> */}
  </div>
);
