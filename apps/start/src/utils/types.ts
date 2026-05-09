import type { AppRouterClient } from "@skills-re/api";

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

export interface AiMatch {
  itemKey?: string;
  score?: number;
  snippet?: string;
  sourcePath?: string;
  version?: string;
}

type SkillsSearchResult = Awaited<ReturnType<AppRouterClient["skills"]["search"]>>;

export type BrowseSkillItem = Extract<SkillsSearchResult, { page: unknown[] }>["page"][number];

export type CategoryListItem = Awaited<ReturnType<AppRouterClient["categories"]["list"]>>[number];

export type TagListItem = Awaited<ReturnType<AppRouterClient["tags"]["listIndexable"]>>[number];

export interface SkillMdFrontmatterData {
  allowedTools?: string;
  compatibility?: string;
  description: string;
  license?: string;
  metadata?: Record<string, string>;
  name: string;
}
