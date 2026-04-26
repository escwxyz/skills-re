interface CollectionAuditSkill {
  staticAudit?: {
    overallScore: number;
    status: "pass" | "fail";
  } | null;
}

export const formatCollectionSkillPassRate = (skill: CollectionAuditSkill) =>
  skill.staticAudit?.status === "pass" && typeof skill.staticAudit.overallScore === "number"
    ? `${skill.staticAudit.overallScore}%`
    : "—";

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
