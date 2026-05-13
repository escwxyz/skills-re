import { Link } from "@tanstack/react-router";

import { cn, kebabToTitle } from "@/lib/utils";

interface Props {
  tags?: string[];
  className?: string;
}

export const SkillDetailTags = ({ tags, className }: Props) => {
  if (!tags?.length) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-2", className)}>
      {tags.map((tag) => (
        <Link to="/tags/$slug" params={{ slug: tag }} key={tag}>
          <span className="wrap-break-word max-w-full cursor-pointer border-border border-b border-dotted font-mono text-[10px] text-muted-foreground uppercase transition-colors hover:border-foreground hover:text-foreground sm:text-xs">
            #{kebabToTitle(tag)}
          </span>
        </Link>
      ))}
    </div>
  );
};
