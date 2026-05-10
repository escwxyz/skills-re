import { formatInteger } from "@/utils/format";
import type { Locale } from "@/paraglide/runtime";

import type { DailyMetricPoint } from "@/utils/types";

export interface StatStripItem {
  accent?: "green" | "blue" | "red";
  label: string;
  value: string;
}

export const sumDailyMetrics = (points: DailyMetricPoint[]) => {
  const totals = {
    newSkills: 0,
    newSnapshots: 0,
  };

  for (const point of points) {
    totals.newSkills += point.newSkills;
    totals.newSnapshots += point.newSnapshots;
  }

  return totals;
};

export const getLiveStats = (input: {
  authors: { repoCount: number; skillCount: number }[];
  categoryCount: number;
  dailyMetrics: DailyMetricPoint[];
  locale?: Locale;
  skillsCount: number;
}) => {
  const totals = sumDailyMetrics(input.dailyMetrics);
  const authorsCountLabel = formatInteger(input.authors.length, input.locale);
  const categoriesCountLabel = formatInteger(input.categoryCount, input.locale);
  const skillsCountLabel = formatInteger(input.skillsCount, input.locale);
  const newSkills30dLabel = formatInteger(totals.newSkills, input.locale);
  const newSnapshots30dLabel = formatInteger(totals.newSnapshots, input.locale);

  return {
    authorsCountLabel,
    categoriesCountLabel,
    metaStripItems: [
      { label: "Skills Indexed", value: skillsCountLabel },
      { label: "Authors", value: authorsCountLabel },
      { label: "Categories", value: categoriesCountLabel },
      { label: "New Skills (30d)", value: newSkills30dLabel },
      { label: "New Snapshots (30d)", value: newSnapshots30dLabel },
    ] satisfies StatStripItem[],
    newSkills30dLabel,
    newSnapshots30dLabel,
    numbersStripItems: [
      { label: "Skills in the Index", value: skillsCountLabel },
      { label: "Listed Authors", value: authorsCountLabel },
      { label: "New Skills (30d)", value: newSkills30dLabel },
      { label: "New Snapshots (30d)", value: newSnapshots30dLabel },
    ] satisfies StatStripItem[],
    skillsCountLabel,
  };
};
