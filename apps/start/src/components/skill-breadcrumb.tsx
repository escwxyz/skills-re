import { m } from "@/paraglide/messages";
import { Link } from "@tanstack/react-router";

import { SkillSlugSwitcher } from "@/components/skill-slug-switcher";

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
    <Link
      to="/skills"
      className="text-muted-foreground shrink-0 transition-colors hover:text-primary"
    >
      {m.skill_breadcrumb_root({})}
    </Link>
    <span className="shrink-0">/</span>
    <Link
      to="/authors/$handle"
      params={{ handle: skill.authorHandle }}
      className="text-muted-foreground min-w-0 max-w-[34vw] truncate transition-colors hover:text-primary sm:max-w-[16rem]"
    >
      {skill.authorHandle}
    </Link>
    <span className="shrink-0">/</span>
    <SkillSlugSwitcher
      authorHandle={skill.authorHandle}
      repo={skill.repoName}
      className="w-full max-w-full"
      currentSlug={skill.slug}
    />
  </div>
);
