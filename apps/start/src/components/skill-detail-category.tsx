import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { getLocale } from "@/paraglide/runtime";
import { getCategoryTitle } from "@/utils/category-data";
import type { CategorySlug } from "@/utils/category-data";

interface Props {
  categorySlug?: CategorySlug;
  className?: string;
}

export const SkillDetailCategory = ({ categorySlug, className }: Props) => {
  if (!categorySlug) {
    return null;
  }

  const locale = getLocale();

  const label = categorySlug
    ? getCategoryTitle(categorySlug, locale)
    : getCategoryTitle("other", locale);

  return (
    <Link
      to="/categories/$slug"
      params={{ slug: categorySlug }}
      className={cn(
        "group inline-flex items-center gap-2 rounded border bg-muted/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors hover:bg-muted/40",
        className,
      )}
    >
      <span className="text-foreground transition-colors">{label}</span>
    </Link>
  );
};
