import {
  collections_grid_collection,
  collections_grid_featured,
  collections_grid_skills,
} from "@/paraglide/messages";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

const getCollectionGridPosition = (index: number) => {
  const num = String(index + 1).padStart(2, "0");
  const featured = index === 0;
  const noRightBorder = index === 2 || (index >= 4 && (index - 4) % 3 === 0);

  return {
    featured,
    noRightBorder,
    num,
  };
};

interface CollectionGridItem {
  description: string;
  skillCount: number;
  slug: string;
  title: string;
}

interface Props {
  collections: CollectionGridItem[];
}

export const CollectionsGrid = ({ collections }: Props) => (
  <div className="border-border grid grid-cols-1 border-t border-l sm:grid-cols-[2fr_1fr_1fr]">
    {collections.map((col, index) => {
      const { featured, noRightBorder, num } = getCollectionGridPosition(index);

      return (
        <Link
          key={col.slug}
          to="/collections/$slug"
          params={{ slug: col.slug }}
          className={cn(
            "border-border flex flex-col justify-between border-r border-b p-[26px_22px] no-underline transition-colors",
            featured
              ? "bg-foreground text-background hover:opacity-95 min-h-110 sm:row-span-2 sm:border-b-0"
              : "hover:bg-muted min-h-55",
            noRightBorder && "sm:border-r-0",
          )}
        >
          <div>
            <div
              className={cn(
                "mb-2 flex justify-between font-mono text-[10.5px] tracking-[.14em] uppercase",
                featured ? "text-background/50" : "text-muted-foreground",
              )}
            >
              <span>
                {collections_grid_collection()} {num}
                {featured ? ` — ${collections_grid_featured()}` : ""}
              </span>
              <span>
                {col.skillCount} {collections_grid_skills()}
              </span>
            </div>
            <h3
              className={cn(
                "font-display m-0 my-2 leading-none font-normal",
                featured
                  ? "text-[clamp(2rem,4vw,3.5rem)] italic"
                  : "text-[clamp(1.4rem,2.5vw,2.1rem)]",
              )}
            >
              {col.title}
            </h3>
          </div>
          <p
            className={cn(
              "m-0 font-serif leading-[1.45]",
              featured ? "text-[15px] text-[#bbb3a2]" : "text-muted-foreground text-[13px]",
            )}
          >
            {col.description}
          </p>
        </Link>
      );
    })}
  </div>
);
