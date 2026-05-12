import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { SkillCard } from "@/components/skill-card";
import { getTagTopSkills } from "@/functions/tags/get-tag-top-skills";
import {
  tag_page_no_public_skills,
  tag_page_see_all_skills,
  tag_page_top_skills,
} from "@/paraglide/messages";
import { buildTagSeo, formatPublicSkillCount } from "@/lib/seo-taxonomy";
import { getLocale } from "@/paraglide/runtime";

export const TagTopSkills = ({ slug }: { slug: string }) => {
  const locale = getLocale();
  const getTopSkills = useServerFn(getTagTopSkills);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tagTopSkills", slug],
    queryFn: () => getTopSkills({ data: { slug } }),
    refetchInterval: 12 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return <TagTopSkillsSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="border-border border px-6 py-10 font-mono text-sm text-destructive">
        Something went wrong while loading the top skills for this tag. Please try again later.
      </div>
    );
  }

  const seo = buildTagSeo({ count: data.count, locale, slug });

  return (
    <section className="border-border border-b px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-mono text-muted-foreground text-sm uppercase tracking-[0.16em]">
            {tag_page_top_skills()}
          </h2>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
            {formatPublicSkillCount(data.count, locale)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="max-w-120 text-right font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-foreground">
            {seo.description}
          </div>
          <Link
            to="/skills"
            search={{ tags: [slug] }}
            className="border-border text-muted-foreground hover:text-foreground rounded-none border px-4 py-2 font-mono text-[10px] tracking-[.14em] uppercase transition-colors"
          >
            {tag_page_see_all_skills()}
          </Link>
        </div>
      </div>

      {data.topSkills.length > 0 ? (
        <div className="grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
          {data.topSkills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="border-border text-muted-foreground border px-6 py-10 text-sm">
          {tag_page_no_public_skills()}
        </div>
      )}
    </section>
  );
};

const TagTopSkillsSkeleton = () => (
  <section className="border-border border-b px-6 py-10">
    <div className="mb-6 flex items-center justify-between gap-4">
      <div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-3 w-36" />
      </div>
      <Skeleton className="h-8 w-28" />
    </div>
    <div className="grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-border border p-5">
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="mb-2 h-6 w-full" />
          <Skeleton className="mb-4 h-3 w-full" />
          <Skeleton className="mt-auto h-8 w-full" />
        </div>
      ))}
    </div>
  </section>
);
