import type { Locale } from "@/paraglide/runtime";
import { formatCompactNumber } from "@/utils/format";

import type { BrowseSkillItem } from "@/utils/types";

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
