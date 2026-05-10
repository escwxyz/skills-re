import { ArrowRightIcon, CaretUpDownIcon } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { m } from "@/paraglide/messages";

interface SkillRef {
  slug: string;
  title: string;
}

interface Props {
  currentSlug: string;
  publisherHandle: string;
  skills: SkillRef[];
}

export const SkillSlugSwitcher = ({ currentSlug, publisherHandle, skills }: Props) => {
  const current = skills.find((s) => s.slug === currentSlug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-border hover:bg-paper-2 data-popup-open:bg-paper-2 flex  items-center gap-1 border px-2 py-0.5 font-mono text-[10.5px] tracking-[.14em] uppercase outline-none">
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
            window.location.href = `/authors/${publisherHandle}`;
          }}
        >
          {m.skill_slug_switcher_view_all()} <ArrowRightIcon />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
