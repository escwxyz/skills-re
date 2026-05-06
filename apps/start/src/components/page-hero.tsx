import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string;
  accent?: "green" | "blue" | "red";
}

export interface PageHeroProps {
  eyebrow: string;
  description: string;
  descriptionItalic?: boolean;
  stats?: Stat[];
  borderThick?: boolean;
  children: ReactNode;
  media?: ReactNode;
  aside?: ReactNode;
  className?: string;
}

const accentClass = (accent?: Stat["accent"]) => {
  if (accent === "green") {
    return "text-editorial-green";
  }

  if (accent === "blue") {
    return "text-editorial-blue";
  }

  if (accent === "red") {
    return "text-destructive";
  }

  return "text-foreground";
};

export const PageHero = ({
  eyebrow,
  description,
  descriptionItalic = false,
  stats,
  borderThick = false,
  children,
  media,
  aside,
  className,
}: PageHeroProps) => {
  const hasMedia = Boolean(media);
  const hasAside = Boolean(aside);
  const hasStats = Boolean(stats?.length);
  const hasSecondaryColumn = hasAside || hasStats;
  let gridColumns = "md:grid-cols-1";

  if (hasMedia) {
    gridColumns = hasSecondaryColumn
      ? "md:grid-cols-[auto_minmax(0,1fr)_auto]"
      : "md:grid-cols-[auto_minmax(0,1fr)]";
  } else if (hasSecondaryColumn) {
    gridColumns = "md:grid-cols-[1fr_auto]";
  }

  return (
    <section
      className={cn(
        "grid grid-cols-1 items-end gap-8 p-10",
        gridColumns,
        borderThick ? "border-border border-b-[3px]" : "border-border border-b",
        className,
      )}
    >
      {hasMedia ? (
        <div className="border-border flex flex-col items-center border-b pb-8 text-center md:border-r md:border-b-0 md:pr-8">
          {media}
        </div>
      ) : null}

      <div className={cn(hasMedia && "min-w-0")}>
        <div className="text-destructive mb-3 font-mono text-[10.5px] tracking-[.2em] uppercase">
          {eyebrow}
        </div>
        <h1 className="font-display m-0 text-[clamp(52px,9vw,104px)] leading-[.92] font-normal tracking-tight">
          {children}
        </h1>
        <p
          className={cn(
            "text-ink-2 mt-5 max-w-170 font-serif text-[20px] leading-[1.45]",
            descriptionItalic && "italic",
          )}
        >
          {description}
        </p>
      </div>

      {hasSecondaryColumn ? (
        <div className="text-muted-foreground font-mono text-[11px] leading-loose tracking-widest uppercase md:text-right">
          {hasStats
            ? stats?.map((stat) => (
                <div key={`${stat.label}-${stat.value}`}>
                  {stat.label}{" "}
                  <b className={cn("font-medium", accentClass(stat.accent))}>{stat.value}</b>
                </div>
              ))
            : null}
          {hasAside ? aside : null}
        </div>
      ) : null}
    </section>
  );
};
