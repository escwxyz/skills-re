import type { Locale } from "@/paraglide/runtime";
import {
  author_activity_published,
  author_activity_updated,
  author_stats_aggregate_stars,
  author_stats_avg_audit_score,
  author_stats_published_skills,
  author_stats_repositories,
  author_stats_total_installs,
} from "@/paraglide/messages";
import { formatCompactNumber, formatDate, formatInteger } from "@/utils/format";
import { getAuthorDisplayName, getAvatarLabel } from "./author-shared";

import type { BrowseSkillItem } from "@/utils/types";

interface AuthorInput {
  handle: string;
  avatarUrl?: string | null;
  githubUrl?: string | null;
  isVerified?: boolean;
  name?: string | null;
  repoCount?: number;
  skillCount?: number;
}

export const toAuthorSkillRowData = (skill: BrowseSkillItem, index: number, locale?: Locale) => ({
  auditScoreLabel:
    typeof skill.staticAudit?.overallScore === "number"
      ? `${skill.staticAudit.overallScore}/100`
      : "—",
  description: skill.description,
  authorHandle: skill.authorHandle ?? skill.author?.handle ?? "unknown-author",
  downloadsLabel: formatCompactNumber(skill.downloadsAllTime ?? 0, locale),
  id: skill.id,
  index,
  latestVersionLabel: skill.latestVersion ? `v${skill.latestVersion}` : "latest",
  licenseLabel: skill.license ?? "No license",
  repoName: skill.repoName ?? "",
  slug: skill.slug,
  starsLabel: formatCompactNumber(skill.stargazerCount ?? 0, locale),
  title: skill.title,
});

export const buildAuthorActivity = (skills: BrowseSkillItem[], locale?: Locale) =>
  [...skills]
    .toSorted((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
    .slice(0, 5)
    .map((skill) => ({
      dateLabel: formatDate(skill.updatedAt ?? skill.createdAt ?? Date.now(), locale, {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
      }),
      itemLabel: skill.latestVersion ? `${skill.title} ${skill.latestVersion}` : skill.title,
      text: skill.updatedAt ? String(author_activity_updated()) : String(author_activity_published()),
    }));

export const buildAuthorStats = (
  author: AuthorInput,
  skills: BrowseSkillItem[],
  locale?: Locale,
) => {
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
        label: String(author_stats_published_skills()),
        value: formatInteger(author.skillCount ?? skills.length, locale),
      },
      {
        label: String(author_stats_repositories()),
        value: formatInteger(author.repoCount ?? 0, locale),
      },
      {
        label: String(author_stats_total_installs()),
        value: formatCompactNumber(totalDownloads, locale),
      },
      {
        label: String(author_stats_aggregate_stars()),
        value: formatCompactNumber(totalStars, locale),
      },
      {
        label: String(author_stats_avg_audit_score()),
        value: skills.length > 0 ? `${averageAudit}/100` : "—",
      },
    ],
  };
};

export const buildAuthorDetailPageData = ({
  author,
  locale,
  skills,
}: {
  author: AuthorInput;
  locale: Locale;
  skills: BrowseSkillItem[];
}) => ({
  activity: buildAuthorActivity(skills, locale),
  avatarLabel: getAvatarLabel(author),
  githubUrl: author.githubUrl,
  handle: author.handle,
  isVerified: Boolean(author.isVerified),
  name: getAuthorDisplayName(author),
  skillCount: author.skillCount ?? skills.length,
  skills: skills.map((skill, index) => toAuthorSkillRowData(skill, index, locale)),
  stats: buildAuthorStats(author, skills, locale),
});
