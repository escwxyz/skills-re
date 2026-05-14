export interface InvalidSkillPreview {
  message: string;
  skillMdPath: string;
  skillRootPath: string;
}

export interface SkillPreview {
  skillDescription: string;
  skillMdPath: string;
  skillRootPath: string;
  skillTitle: string;
}

export interface RepoPreview {
  branch: string;
  invalidSkills: InvalidSkillPreview[];
  owner: string;
  repo: string;
  requestedSkillPath: string | null;
  skills: SkillPreview[];
}

export interface PreviewDiagnosticMessages {
  logs_found_invalid_skill_like_folders: (input?: Record<string, never>) => string;
  logs_no_publishable_skills: (input?: Record<string, never>) => string;
  logs_no_publishable_skills_under: (input: { path: string }) => string;
  logs_no_recognized_skill_roots: (input?: Record<string, never>) => string;
}

const normalizeMessage = (value: string) => value.trim().replace(/[.。]+$/, "");

export const buildPreviewDiagnostics = (
  preview: RepoPreview,
  messages: PreviewDiagnosticMessages,
) => {
  if (preview.skills.length > 0) {
    return [];
  }

  if (preview.invalidSkills.length > 0) {
    const details = preview.invalidSkills.map(
      (skill) => `- ${skill.skillMdPath}: ${normalizeMessage(skill.message)}`,
    );

    return [
      preview.requestedSkillPath
        ? messages.logs_no_publishable_skills_under({
            path: preview.requestedSkillPath,
          })
        : messages.logs_no_publishable_skills({}),
      messages.logs_found_invalid_skill_like_folders({}),
      ...details,
    ];
  }

  return [
    preview.requestedSkillPath
      ? messages.logs_no_publishable_skills_under({
          path: preview.requestedSkillPath,
        })
      : messages.logs_no_publishable_skills({}),
    messages.logs_no_recognized_skill_roots({}),
  ];
};
