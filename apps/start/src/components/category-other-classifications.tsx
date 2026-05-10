import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import { categories_page_other_classifications } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getCategoryLabel, getCategoryPresentation } from "@/utils/category-data";

export const CategoryOtherClassifications = ({ currentSlug }: { currentSlug: string }) => {
  const locale = getLocale();

  const { data, isLoading } = useQuery({
    ...orpc.categories.list.queryOptions({ all: true, limit: 100 }),
    select: (categories) => categories.filter((cat) => cat.slug !== currentSlug),
    refetchInterval: 48 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return <CategoryOtherClassificationsSkeleton />;
  }

  if (!data?.length) {
    return null;
  }

  return (
    <section className="border-border border-b px-6 py-8">
      <div className="text-muted-foreground mb-4 font-mono text-[10px] tracking-[.16em] uppercase">
        {categories_page_other_classifications()}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {data.map((cat) => (
          <Link
            key={cat.slug}
            to="/categories/$slug"
            params={{ slug: cat.slug }}
            className="text-muted-foreground hover:text-foreground font-mono text-[10.5px] tracking-widest uppercase transition-colors"
          >
            {getCategoryPresentation(cat.slug, undefined, locale).num}{" "}
            {getCategoryLabel(cat.slug, locale)}
          </Link>
        ))}
      </div>
    </section>
  );
};

const CategoryOtherClassificationsSkeleton = () => (
  <section className="border-border border-b px-6 py-8">
    <Skeleton className="mb-4 h-3 w-40" />
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-28" />
      ))}
    </div>
  </section>
);
