import { ArrowRightIcon, CaretUpDownIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

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

interface Props {
  authorHandle: string;
  currentSlug: string;
}

export const SkillSlugSwitcher = ({ authorHandle, currentSlug }: Props) => {
  const getSkills = useServerFn(getAuthorSkills);
  const { data, isLoading } = useQuery({
    queryKey: ["authorSkills", authorHandle],
    queryFn: () => getSkills({ data: { handle: authorHandle } }),
    select: (skills) => skills.map((s) => ({ slug: s.slug, title: s.title })),
    refetchInterval: 24 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton className="h-5 w-28" />;
  }

  const skills = data ?? [];
  const current = skills.find((s) => s.slug === currentSlug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-border hover:bg-paper-2 data-popup-open:bg-paper-2 flex items-center gap-1 border px-2 py-0.5 font-mono text-[10.5px] tracking-[.14em] uppercase outline-none">
        <b className="text-ink font-medium">{current?.title ?? currentSlug}</b>
        <CaretUpDownIcon className="text-muted-text size-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="min-w-48">
        {skills.map((s) => (
          <DropdownMenuItem
            key={s.slug}
            data-current={s.slug === currentSlug}
            className="data-[current=true]:bg-accent data-[current=true]:text-accent-foreground"
            onClick={() => {
              window.location.href = `/skills/${s.slug}`;
            }}
          >
            {s.title}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-muted-foreground"
          onClick={() => {
            window.location.href = `/authors/${authorHandle}`;
          }}
        >
          {m.skill_slug_switcher_view_all()} <ArrowRightIcon />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
