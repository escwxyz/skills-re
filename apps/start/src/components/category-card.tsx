import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { getLocale } from "@/paraglide/runtime";
import { category_card_skills } from "@/paraglide/messages";
import {
  getCategoryDescription,
  getCategoryLabel,
  getCategoryPresentation,
} from "@/utils/category-data";
import type { CategoryListItem } from "@/utils/types";

export const TITLE_VARIANT_CLASS: Record<
  "default" | "accent" | "blue" | "green" | "italic",
  string
> = {
  accent: "text-destructive",
  blue: "text-editorial-blue italic",
  default: "",
  green: "text-editorial-green",
  italic: "italic",
};

interface Props {
  category: CategoryListItem;
  index?: number;
}

export const CategoryCard = ({ category, index }: Props) => {
  const locale = getLocale();
  const presentation = getCategoryPresentation(category.slug, index, locale);
  const title = getCategoryLabel(category.slug, locale);
  const description = getCategoryDescription(category.slug, locale);

  return (
    <Link
      to="/categories/$slug"
      params={{ slug: category.slug }}
      className="bg-background hover:bg-secondary flex min-h-80 flex-col p-[22px_18px_20px] no-underline transition-colors hover:no-underline"
    >
      <div className="text-muted-foreground mb-2.5 font-mono text-[10.5px] tracking-[.14em] uppercase">
        {presentation.num}
      </div>
      <h4
        className={cn(
          "font-display mt-0 mb-3 text-[36px] leading-[.95] font-normal",
          TITLE_VARIANT_CLASS[presentation.variant ?? "default"],
        )}
      >
        {title}
      </h4>
      <p className="text-muted-foreground mb-auto font-serif text-sm leading-normal">
        {description}
      </p>
      <div className="text-muted-foreground mt-4 flex gap-4 font-mono text-[10.5px] tracking-widest uppercase">
        <div>
          {category_card_skills()}
          <b className="text-foreground block font-medium">
            {category.count.toLocaleString(locale)}
          </b>
        </div>
      </div>
    </Link>
  );
};
