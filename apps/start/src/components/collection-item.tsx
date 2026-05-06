// oxlint-disable no-nested-ternary
import {
  collections_page_passing,
  skill_card_metric_installs,
  skill_detail_no_tags,
} from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

interface CollectionSkillItem {
  description: string;
  id: string;
  installs: string;
  passRate: string;
  publisherName: string;
  slug: string;
  tags: string[];
  title: string;
  version: string;
}

interface Props {
  index: number;
  skill: CollectionSkillItem;
}

export const CollectionItem = ({ skill, index }: Props) => {
  const isItalic = index % 2 === 0;
  const isAccent = (index + 1) % 3 === 0;
  const isBlue = (index + 1) % 5 === 0;
  const titleClass = isAccent
    ? "text-destructive"
    : isBlue
      ? "text-editorial-blue"
      : "text-foreground";

  return (
    <Link
      to={localizeHref(`/skills/${skill.slug}`)}
      className="border-border hover:bg-muted grid grid-cols-[56px_1fr] items-start gap-x-5 gap-y-3 border-b px-4 py-7 no-underline transition-colors md:grid-cols-[72px_1fr_auto] md:gap-x-8 md:px-6 md:py-9"
    >
      <div className="text-muted-foreground/40 pt-1 font-display text-[clamp(2.5rem,6vw,5rem)] leading-none italic">
        {String(index + 1).padStart(2, "0")}.
      </div>

      <div className="min-w-0">
        <div className="text-muted-foreground mb-2 truncate font-mono text-[10.5px] tracking-widest uppercase">
          {skill.id} · v.{skill.version} · {skill.publisherName}
        </div>
        <h3
          className={cn(
            "font-display m-0 mb-3 text-[clamp(1.8rem,4vw,3rem)] leading-[.95] font-normal tracking-tight",
            titleClass,
            isItalic && !isAccent && !isBlue && "italic",
          )}
        >
          {skill.title}
        </h3>
        <p className="text-muted-foreground m-0 mb-3 font-serif text-[15px] leading-relaxed">
          {skill.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 md:gap-2.5">
          {skill.tags.length > 0 ? (
            skill.tags.map((tag) => (
              <span
                key={tag}
                className="border-border text-muted-foreground rounded-full border px-2.5 py-1 font-mono text-[10px] leading-none tracking-[.14em] uppercase"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground font-mono text-[10px] tracking-[.14em] uppercase">
              {skill_detail_no_tags()}
            </span>
          )}
        </div>
        <div className="text-muted-foreground mt-4 flex gap-5 font-mono text-[10.5px] tracking-widest uppercase md:hidden">
          <div>
            {collections_page_passing()}{" "}
            <b className="font-display text-foreground ml-1 text-[13px] font-normal tracking-normal normal-case">
              {skill.passRate}
            </b>
          </div>
          <div>
            {skill_card_metric_installs()}{" "}
            <b className="font-display text-foreground ml-1 text-[13px] font-normal tracking-normal normal-case">
              {skill.installs}
            </b>
          </div>
        </div>
      </div>

      <div className="text-muted-foreground hidden shrink-0 pt-1 font-mono text-[10.5px] leading-loose tracking-widest uppercase md:block">
        <div>
          {collections_page_passing()}
          <b className="font-display text-foreground block text-[14px] font-normal">
            {skill.passRate}
          </b>
        </div>
        <div>
          {skill_card_metric_installs()}
          <b className="font-display text-foreground block text-[14px] font-normal">
            {skill.installs}
          </b>
        </div>
      </div>
    </Link>
  );
};
