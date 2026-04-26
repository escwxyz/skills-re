import { formatCompactNumber } from "./registry-data";

interface CollectionAuditSkill {
  downloadsAllTime?: number;
  latestSnapshotTotalBytes?: number;
  license?: string;
  staticAudit?: {
    overallScore: number;
    status: "pass" | "fail";
  } | null;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatCollectionSkillPassRate = (skill: CollectionAuditSkill) =>
  skill.staticAudit?.status === "pass" && typeof skill.staticAudit.overallScore === "number"
    ? `${skill.staticAudit.overallScore}%`
    : "—";

export const formatCollectionTotalDownloads = (skills: CollectionAuditSkill[]) =>
  formatCompactNumber(skills.reduce((total, skill) => total + (skill.downloadsAllTime ?? 0), 0));

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
    if (!license) {
      continue;
    }

    licenses.set(license, (licenses.get(license) ?? 0) + 1);
  }

  if (licenses.size === 0) {
    return "—";
  }

  return [...licenses.entries()]
    .toSorted((left, right) => {
      const countDiff = right[1] - left[1];
      if (countDiff === 0) {
        return left[0].localeCompare(right[0]);
      }

      return countDiff;
    })
    .map(([license]) => license)
    .slice(0, 3)
    .join(" · ");
};

export const formatCollectionPassRate = (skills: CollectionAuditSkill[]) => {
  const auditedSkills = skills.filter((skill) => skill.staticAudit);

  if (auditedSkills.length === 0) {
    return "—";
  }

  const passingSkills = auditedSkills.filter(
    (skill) => skill.staticAudit?.status === "pass",
  ).length;

  return `${Math.round((passingSkills / auditedSkills.length) * 100)}%`;
};
