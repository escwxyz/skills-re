import { m } from "@/paraglide/messages";
import { Link } from "@tanstack/react-router";

import { SkillSlugSwitcher } from "@/components/skill-slug-switcher";

interface Props {
  skill: {
    authorHandle: string;
    id: string;
    slug: string;
  };
}

export const SkillBreadcrumb = ({ skill }: Props) => (
  <div className="mb-8 flex items-center gap-2 font-mono text-muted-foreground text-xs uppercase tracking-widest">
    <Link to="/skills" className="text-muted-text transition-colors hover:text-primary">
      {m.skill_breadcrumb_root({})}
    </Link>
    <span>/</span>
    <Link
      to="/authors/$handle"
      params={{ handle: skill.authorHandle }}
      className="text-muted-text transition-colors hover:text-primary"
    >
      {skill.authorHandle}
    </Link>
    <span>/</span>
    <SkillSlugSwitcher authorHandle={skill.authorHandle} currentSlug={skill.slug} />

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
