const normalizeSegment = (value: string) => value.trim().toLowerCase();

export interface SkillPathInput {
  authorHandle?: string | null;
  repoName: string;
  skillSlug: string;
}

export const buildSkillDetailPath = (input: SkillPathInput) => {
  const authorHandle = input.authorHandle?.trim();
  const skillSlug = input.skillSlug.trim();

  if (!(authorHandle && skillSlug)) {
    return `/skills/${skillSlug}`;
  }

  const normalizedAuthor = normalizeSegment(authorHandle);
  const normalizedSkillSlug = normalizeSegment(skillSlug);
  const repoName = input.repoName.trim();

  if (repoName) {
    return `/skills/${normalizedAuthor}/${normalizeSegment(repoName)}/${normalizedSkillSlug}`;
  }

  return `/skills/${normalizedAuthor}/${normalizedSkillSlug}`;
};
