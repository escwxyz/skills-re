import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getCategoriesStats } from "@/functions/categories/get-categories-stats";
import {
  categories_index_stat_disciplines,
  categories_index_stat_listed_authors,
  categories_index_stat_new_skills,
  categories_index_stat_skills_indexed,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatInteger } from "@/utils/format";
import { sumDailyMetrics } from "@/utils/stats";
import { cn } from "@/lib/utils";

interface Props {
  categoriesCount: number;
  skillsCount: number;
}

export const CategoriesStatsStrip = ({ categoriesCount, skillsCount }: Props) => {
  const locale = getLocale();
  const getStats = useServerFn(getCategoriesStats);

  const { data } = useQuery({
    queryKey: ["categoriesStats"],
    queryFn: () => getStats(),
    select: (d) => ({
      authorsCount: d.authorsCount,
      newSkillsCount: sumDailyMetrics(d.dailyMetrics).newSkills,
    }),
    refetchInterval: 60 * 60 * 1000,
  });

  const stats = [
    {
      label: String(categories_index_stat_disciplines()),
      value: formatInteger(categoriesCount, locale),
    },
    {
      label: String(categories_index_stat_skills_indexed()),
      value: formatInteger(skillsCount, locale),
    },
    {
      label: String(categories_index_stat_listed_authors()),
      value: data ? formatInteger(data.authorsCount, locale) : "—",
    },
    {
      label: String(categories_index_stat_new_skills()),
      value: data ? formatInteger(data.newSkillsCount, locale) : "—",
    },
  ];

  return (
    <div className="border-border grid grid-cols-2 border-b-[3px] font-mono text-[10.5px] tracking-widest uppercase md:grid-cols-4">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            "border-border border-r px-5 py-4.5",
            i === stats.length - 1 ? "border-r-0" : "",
          )}
        >
          <div className="text-muted-foreground">{s.label}</div>
          <div className="font-display mt-1 text-[36px] leading-none font-normal">{s.value}</div>
        </div>
      ))}
    </div>
  );
};
