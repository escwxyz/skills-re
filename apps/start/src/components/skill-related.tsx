import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { SkillCard } from "@/components/skill-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getRelatedSkills } from "@/functions/skills/get-related-skills";
import { m } from "@/paraglide/messages";

interface SkillRelatedProps {
  primaryCategory?: string | null;
  skillId: string;
  tags?: string[] | null;
}

export const SkillRelated = ({ primaryCategory, skillId, tags }: SkillRelatedProps) => {
  const getRelatedSkillsFn = useServerFn(getRelatedSkills);

  const relatedTags = useMemo(() => (tags?.length ? tags.slice(0, 3) : []), [tags]);
  const hasTags = relatedTags.length > 0;
  const hasCategory = !hasTags && Boolean(primaryCategory);

  const { data, isLoading } = useQuery({
    enabled: hasTags || hasCategory,
    queryFn: () =>
      getRelatedSkillsFn({
        data: {
          category: hasCategory ? (primaryCategory ?? undefined) : undefined,
          excludeId: skillId,
          tags: hasTags ? relatedTags : undefined,
        },
      }),
    queryKey: ["relatedSkills", skillId, relatedTags, primaryCategory],
    staleTime: 5 * 60 * 1000,
  });

  if (!isLoading && (!data || data.length === 0)) {
    return null;
  }

  return (
    <section className="border-b border-border px-4 md:px-6 py-10">
      <div className="flex items-end justify-between mb-3">
        <h2 className="font-display text-4xl font-normal m-0">{m.skill_detail_related_skills()}</h2>
        <span className="text-muted-foreground font-mono text-[10px] tracking-[.14em] uppercase hidden md:inline">
          {m.skill_detail_related_skills_subtitle()}
        </span>
      </div>
      <div className="border-t border-border mb-0" />

      {isLoading ? (
        <SkillRelatedSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border-l border-border">
          {(data ?? []).map((skill) => (
            <SkillCard key={skill.id} skill={skill} hideAuthorName={false} />
          ))}
        </div>
      )}
    </section>
  );
};

const SkillRelatedSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border-l border-t border-border">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="border-r border-b border-border p-5 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    ))}
  </div>
);
