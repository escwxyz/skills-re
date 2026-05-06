import { formatCompactNumber, formatFileSize } from "@/utils/format";
import type { Locale } from "@/paraglide/runtime";

interface CollectionAuditSkill {
  downloadsAllTime?: number;
  latestSnapshotTotalBytes?: number;
  license?: string;
  staticAudit?: {
    overallScore: number;
    status: "pass" | "fail";
  } | null;
}

export const formatCollectionSkillPassRate = (skill: CollectionAuditSkill) =>
  skill.staticAudit?.status === "pass" && typeof skill.staticAudit.overallScore === "number"
    ? `${skill.staticAudit.overallScore}%`
    : "—";

export const formatCollectionTotalDownloads = (skills: CollectionAuditSkill[], locale?: Locale) =>
  formatCompactNumber(
    skills.reduce((total, skill) => total + (skill.downloadsAllTime ?? 0), 0),
    locale,
  );

export const formatCollectionTotalFileSize = (skills: CollectionAuditSkill[]) => {
  const totalBytes = skills.reduce(
    (total, skill) => total + (skill.latestSnapshotTotalBytes ?? 0),
    0,
  );
  return totalBytes > 0 ? formatFileSize(totalBytes) : "—";
};

export const formatCollectionLicenseMix = (skills: CollectionAuditSkill[]) => {
  const licenses = new Map<string, number>();
  for (const skill of skills) {
    const license = skill.license?.trim();
    if (license) {
      licenses.set(license, (licenses.get(license) ?? 0) + 1);
    }
  }
  if (licenses.size === 0) {
    return "—";
  }
  return [...licenses.entries()]
    .toSorted((l, r) => r[1] - l[1] || l[0].localeCompare(r[0]))
    .map(([license]) => license)
    .slice(0, 3)
    .join(" · ");
};

export const formatCollectionPassRate = (skills: CollectionAuditSkill[]) => {
  const audited = skills.filter((s) => s.staticAudit);
  if (audited.length === 0) {
    return "—";
  }
  const passing = audited.filter((s) => s.staticAudit?.status === "pass").length;
  return `${Math.round((passing / audited.length) * 100)}%`;
};
