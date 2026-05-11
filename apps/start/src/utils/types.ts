import type { AppRouterClient } from "@skills-re/api";

type SkillsSearchResult = Awaited<ReturnType<AppRouterClient["skills"]["search"]>>;

export type BrowseSkillItem = Extract<SkillsSearchResult, { page: unknown[] }>["page"][number];
