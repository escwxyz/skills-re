import { m } from "@/paraglide/messages";
import { SkillCard } from "@/components/skill-card";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getCategoryTopSkills } from "@/functions/categories/get-category-top-skills";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocale } from "@/paraglide/runtime";

export const CategoryTopSkills = ({ slug }: { slug: string }) => {
  const locale = getLocale();
  const getCategoryTopSkillsData = useServerFn(getCategoryTopSkills);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["categoryTopSkills", slug],
    queryFn: () => getCategoryTopSkillsData({ data: { slug } }),
    // Refetch every 12 hours to keep data fresh, because it can change when new skills are added or existing skills are updated in the category.
    refetchInterval: 12 * 60 * 60 * 1000,
  });

  if (isLoading && !isError) {
    return <CategoryTopSkillsSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="border-border border px-6 py-10 font-mono text-sm text-destructive">
        {/** todo i18n */}
        Something went wrong while loading the top skills for this category. Please try again later.
      </div>
    );
  }

  return (
    <section className="border-border border-b px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-muted-foreground font-mono text-[11px] tracking-[.16em] uppercase">
            {m.categories_page_top_skills()}
          </div>
          <div className="text-muted-foreground mt-1 font-mono text-[10.5px] tracking-[.12em] uppercase">
            {m.categories_page_skills_in_this_classification({
              count: data.count.toLocaleString(locale),
            })}
          </div>
        </div>
        <Link
          to="/skills"
          search={{ category: slug }}
          className="border-border text-muted-foreground hover:text-foreground rounded-none border px-4 py-2 font-mono text-[10px] tracking-[.14em] uppercase transition-colors"
        >
          {m.categories_page_see_all_skills()}
        </Link>
      </div>

      {data.topSkills.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {data.topSkills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} hideAuthorName={false} />
          ))}
        </div>
      ) : (
        <div className="border-border text-muted-foreground border px-6 py-10 font-mono text-sm">
          {m.categories_page_no_skills_yet()}
        </div>
      )}
    </section>
  );
};

const CategoryTopSkillsSkeleton = () => (
  <section className="border-border border-b px-6 py-10">
    <div className="mb-6 flex items-center justify-between gap-4">
      <div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-3 w-48" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="border-border border p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-3 w-full mb-4" />
          <Skeleton className="h-8 w-full mt-auto" />
        </div>
      ))}
    </div>
  </section>
);
