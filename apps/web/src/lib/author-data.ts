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

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

export const getAuthorDisplayName = (author: AuthorItem) => author.name ?? `@${author.handle}`;

export const getAvatarLabel = (author: Pick<AuthorItem, "handle" | "name">) =>
  (author.name ?? author.handle).trim().charAt(0).toUpperCase();

export const sortAuthors = (authors: AuthorItem[]) =>
  [...authors].toSorted((left, right) => {
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

export const buildAuthorActivity = (skills: SearchSkillListItem[]): AuthorActivityItem[] =>
  [...skills]
    .toSorted((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
    .slice(0, 5)
    .map((skill) => ({
      dateLabel: DATE_FORMATTER.format(new Date(skill.updatedAt ?? skill.createdAt ?? Date.now())),
      itemLabel: skill.latestVersion ? `${skill.title} ${skill.latestVersion}` : skill.title,
      text: skill.updatedAt ? "Updated" : "Published",
    }));

export const buildAuthorStats = (
  author: AuthorItem,
  skills: SearchSkillListItem[],
): AuthorStatsData => {
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
