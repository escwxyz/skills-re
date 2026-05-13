import { useState } from "react";
import { ArrowRightIcon, CaretUpDownIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthorSkills } from "@/functions/authors/get-author-skills";
import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";

import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  authorHandle: string;
  repo: string;
  currentSlug: string;
  className?: string;
}

const SkillSlugOptions = ({
  authorHandle,
  repo,
  currentSlug,
  skills,
}: {
  authorHandle: string;
  repo: string;
  currentSlug: string;
  skills: { slug: string; title: string }[];
}) => (
  <ul>
    {skills.map((s) => (
      <li key={s.slug} className="border-border border-b last:border-b-0">
        <Link
          to="/skills/$author/$repo/$slug"
          params={{
            author: authorHandle,
            repo,
            slug: s.slug,
          }}
          data-current={s.slug === currentSlug}
          className="hover:bg-paper-2 data-[current=true]:bg-accent data-[current=true]:text-accent-foreground flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-mono text-[11px] tracking-normal normal-case transition-colors"
        >
          <span className="min-w-0 truncate">{s.title}</span>
          {s.slug === currentSlug ? (
            <span className="shrink-0 text-[10px] uppercase tracking-[.12em]">
              {m.skill_version_current_badge()}
            </span>
          ) : null}
        </Link>
      </li>
    ))}
    <li className="border-border border-t">
      <Link
        to="/authors/$handle"
        params={{ handle: authorHandle }}
        className="hover:bg-paper-2 flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-mono text-[11px] tracking-[.12em] uppercase text-muted-foreground transition-colors"
      >
        <span>{m.skill_slug_switcher_view_all()}</span>
        <ArrowRightIcon />
      </Link>
    </li>
  </ul>
);

const SkillSlugSwitcherDropdown = ({
  authorHandle,
  repo,
  className,
  currentSlug,
  skills,
}: Props & {
  skills: { slug: string; title: string }[];
}) => {
  const current = skills.find((s) => s.slug === currentSlug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex min-w-0 items-center justify-between gap-2 border px-2 py-0.5 font-mono text-[10.5px] tracking-[.14em] uppercase outline-none w-fit!",
          className,
        )}
      >
        <b className="text-ink min-w-0 truncate font-medium">{current?.title ?? currentSlug}</b>
        <CaretUpDownIcon className="text-muted-text size-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="min-w-48">
        {skills.map((s) => (
          <DropdownMenuItem
            key={s.slug}
            render={
              <Link
                to="/skills/$author/$repo/$slug"
                params={{
                  author: authorHandle,
                  repo,
                  slug: s.slug,
                }}
              />
            }
            data-current={s.slug === currentSlug}
            className="data-[current=true]:bg-accent data-[current=true]:text-accent-foreground"
          >
            {s.title}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link to="/authors/$handle" params={{ handle: authorHandle }} />}
          className="text-muted-foreground"
        >
          {m.skill_slug_switcher_view_all()} <ArrowRightIcon />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const SkillSlugSwitcherDialog = ({
  authorHandle,
  repo,
  className,
  currentSlug,
  skills,
}: Props & {
  skills: { slug: string; title: string }[];
}) => {
  const [open, setOpen] = useState(false);
  const current = skills.find((s) => s.slug === currentSlug);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          "border-border hover:bg-paper-2 data-popup-open:bg-paper-2 flex min-w-0 items-center justify-between gap-2 border px-2 py-0.5 font-mono text-[10.5px] tracking-[.14em] uppercase outline-none",
          className,
        )}
      >
        <b className="text-ink min-w-0 truncate font-medium">{current?.title ?? currentSlug}</b>
        <CaretUpDownIcon className="text-muted-text size-3 shrink-0" />
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="max-w-xs p-0">
        <DialogHeader className="border-border border-b px-5 py-4">
          <DialogTitle className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
            {m.skill_slug_switcher_title()}
          </DialogTitle>
        </DialogHeader>

        <SkillSlugOptions
          authorHandle={authorHandle}
          repo={repo}
          currentSlug={currentSlug}
          skills={skills}
        />
      </DialogContent>
    </Dialog>
  );
};

export const SkillSlugSwitcher = ({ authorHandle, repo, currentSlug, className }: Props) => {
  const getSkills = useServerFn(getAuthorSkills);
  const isMobile = useIsMobile();
  const { data, isLoading } = useQuery({
    queryKey: ["authorSkills", authorHandle, "slug-switcher"],
    queryFn: () => getSkills({ data: { handle: authorHandle } }),
    select: (result) => result.page.map((s) => ({ slug: s.slug, title: s.title })),
    refetchInterval: 24 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton className="h-5 w-28" />;
  }

  const skills = data ?? [];
  return isMobile ? (
    <SkillSlugSwitcherDialog
      authorHandle={authorHandle}
      repo={repo}
      className={className}
      currentSlug={currentSlug}
      skills={skills}
    />
  ) : (
    <SkillSlugSwitcherDropdown
      authorHandle={authorHandle}
      repo={repo}
      className={className}
      currentSlug={currentSlug}
      skills={skills}
    />
  );
};
