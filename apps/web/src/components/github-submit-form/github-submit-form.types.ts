export type FetchStatus = "idle" | "fetching" | "fetched" | "error";
export type SubmitStatus = "idle" | "submitting" | "submitted" | "error";

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
