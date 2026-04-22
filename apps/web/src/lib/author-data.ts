import type { AppRouterClient } from "@skills-re/api/routers/index";

import { formatCompactNumber, formatInteger } from "./registry-data";

interface AuthorItem {
  avatarUrl?: string | null;
  githubUrl?: string;
  handle: string;
  isVerified?: boolean;
  name?: string | null;
  repoCount?: number;
  skillCount?: number;
}

interface SearchSkillListItem {
  author?: {
    handle?: string;
    name?: string | null;
  };
  createdAt?: number;
  description: string;
  downloadsAllTime?: number;
  id: string;
  latestVersion?: string;
  license?: string;
  slug: string;
  stargazerCount?: number;
  staticAudit?: {
    overallScore: number;
  } | null;
  title: string;
  updatedAt?: number;
}

interface DailyMetricPoint {
  day: string;
  newSkills: number;
  newSnapshots: number;
  updatedAtMs: number;
}

export interface AuthorIndexStat {
  accent?: "green" | "blue" | "red";
  label: string;
  value: string;
}

export interface AuthorIndexCard {
  avatarLabel: string;
  githubUrl?: string;
  handle: string;
  isVerified: boolean;
  name: string;
  repoCountLabel: string;
  skillCount: number;
  skillCountLabel: string;
}

export interface AuthorsIndexData {
  alphabeticalAuthors: AuthorIndexCard[];
  stats: AuthorIndexStat[];
  topAuthors: AuthorIndexCard[];
}

export interface AuthorSkillRowData {
  auditScoreLabel: string;
  description: string;
  downloadsLabel: string;
  id: string;
  index: number;
  latestVersionLabel: string;
  licenseLabel: string;
  slug: string;
  starsLabel: string;
  title: string;
}

export interface AuthorActivityItem {
  dateLabel: string;
  itemLabel: string;
  text: string;
}

export interface AuthorStatsData {
  metrics: {
    label: string;
    value: string;
  }[];
}

export interface AuthorDetailData {
  activity: AuthorActivityItem[];
  avatarLabel: string;
  githubUrl?: string;
  handle: string;
  isVerified: boolean;
  name: string;
  skillCount: number;
  skills: AuthorSkillRowData[];
  stats: AuthorStatsData;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

const getAuthorDisplayName = (author: AuthorItem) => author.name ?? `@${author.handle}`;

const getAvatarLabel = (author: Pick<AuthorItem, "handle" | "name">) =>
  (author.name ?? author.handle).trim().charAt(0).toUpperCase();

const sumDailyMetrics = (points: DailyMetricPoint[]) =>
  points.reduce(
    (total, point) => ({
      newSkills: total.newSkills + point.newSkills,
      newSnapshots: total.newSnapshots + point.newSnapshots,
    }),
    { newSkills: 0, newSnapshots: 0 },
  );

const sortAuthors = (authors: AuthorItem[]) =>
  [...authors].sort((left, right) => {
    const bySkills = (right.skillCount ?? 0) - (left.skillCount ?? 0);
    if (bySkills !== 0) {
      return bySkills;
    }
    return getAuthorDisplayName(left).localeCompare(getAuthorDisplayName(right));
  });

export const toAuthorIndexCard = (author: AuthorItem): AuthorIndexCard => ({
  avatarLabel: getAvatarLabel(author),
  githubUrl: author.githubUrl,
  handle: author.handle,
  isVerified: Boolean(author.isVerified),
  name: getAuthorDisplayName(author),
  repoCountLabel: formatInteger(author.repoCount ?? 0),
  skillCount: author.skillCount ?? 0,
  skillCountLabel: formatInteger(author.skillCount ?? 0),
});

export const toAuthorSkillRowData = (
  skill: SearchSkillListItem,
  index: number,
): AuthorSkillRowData => ({
  auditScoreLabel:
    typeof skill.staticAudit?.overallScore === "number"
      ? `${skill.staticAudit.overallScore}/100`
      : "—",
  description: skill.description,
  downloadsLabel: formatCompactNumber(skill.downloadsAllTime ?? 0),
  id: skill.id,
  index,
  latestVersionLabel: skill.latestVersion ? `v${skill.latestVersion}` : "latest",
  licenseLabel: skill.license ?? "No license",
  slug: skill.slug,
  starsLabel: formatCompactNumber(skill.stargazerCount ?? 0),
  title: skill.title,
});

const buildAuthorActivity = (skills: SearchSkillListItem[]): AuthorActivityItem[] =>
  [...skills]
    .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
    .slice(0, 5)
    .map((skill) => ({
      dateLabel: DATE_FORMATTER.format(new Date(skill.updatedAt ?? skill.createdAt ?? Date.now())),
      itemLabel: skill.latestVersion ? `${skill.title} ${skill.latestVersion}` : skill.title,
      text: skill.updatedAt ? "Updated" : "Published",
    }));

const buildAuthorStats = (author: AuthorItem, skills: SearchSkillListItem[]): AuthorStatsData => {
  const totalDownloads = skills.reduce((total, skill) => total + (skill.downloadsAllTime ?? 0), 0);
  const averageAudit =
    skills.length > 0
      ? Math.round(
          skills.reduce((total, skill) => total + (skill.staticAudit?.overallScore ?? 0), 0) /
            skills.length,
        )
      : 0;
  const totalStars = skills.reduce((total, skill) => total + (skill.stargazerCount ?? 0), 0);

  return {
    metrics: [
      {
        label: "Published Skills",
        value: formatInteger(author.skillCount ?? skills.length),
      },
      {
        label: "Repositories",
        value: formatInteger(author.repoCount ?? 0),
      },
      {
        label: "Total Installs",
        value: formatCompactNumber(totalDownloads),
      },
      {
        label: "Aggregate Stars",
        value: formatCompactNumber(totalStars),
      },
      {
        label: "Avg. Audit Score",
        value: skills.length > 0 ? `${averageAudit}/100` : "—",
      },
    ],
  };
};

export const getAuthorsIndexData = async (
  client: AppRouterClient,
): Promise<AuthorsIndexData> => {
  const [authors, dailyMetrics, skillsCount] = await Promise.all([
    client.skills.listAuthors(),
    client.metrics.dailySkillsSnapshots({ limit: 7 }),
    client.skills.count(),
  ]);

  const totals = sumDailyMetrics(dailyMetrics as DailyMetricPoint[]);
  const verifiedCount = authors.filter((author) => author.isVerified).length;
  const sortedAuthors = sortAuthors(authors as AuthorItem[]);

  return {
    alphabeticalAuthors: [...sortedAuthors]
      .sort((left, right) => getAuthorDisplayName(left).localeCompare(getAuthorDisplayName(right)))
      .map(toAuthorIndexCard),
    stats: [
      { label: "Authors", value: formatInteger(authors.length) },
      {
        label: "Verified",
        value: `▣ ${formatInteger(verifiedCount)}`,
        accent: "green",
      },
      { label: "New this week", value: `+ ${formatInteger(totals.newSkills)}` },
      { label: "Skills published", value: formatInteger(skillsCount) },
    ],
    topAuthors: sortedAuthors.slice(0, 3).map(toAuthorIndexCard),
  };
};

export const getAuthorDetailData = async (
  client: AppRouterClient,
  handle: string,
): Promise<AuthorDetailData | null> => {
  const [author, skillsResult] = await Promise.all([
    client.skills.getAuthorByHandle({ handle }),
    client.skills.search({
      authorHandle: handle,
      limit: 50,
      sort: "downloads-all-time",
    }),
  ]);

  if (!author) {
    return null;
  }

  const skills = skillsResult.page as SearchSkillListItem[];

  return {
    activity: buildAuthorActivity(skills),
    avatarLabel: getAvatarLabel(author as AuthorItem),
    githubUrl: author.githubUrl,
    handle: author.handle,
    isVerified: Boolean(author.isVerified),
    name: getAuthorDisplayName(author as AuthorItem),
    skillCount: author.skillCount ?? skills.length,
    skills: skills.map(toAuthorSkillRowData),
    stats: buildAuthorStats(author as AuthorItem, skills),
  };
};
