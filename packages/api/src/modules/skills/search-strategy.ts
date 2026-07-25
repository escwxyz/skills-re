export type SkillKeywordSearchStrategy = "like" | "shadow" | "fts5";

export interface SkillKeywordSearchStrategyConfig {
  authoritativeEngine: "like" | "fts5";
  shadowCompareFts5: boolean;
  strategy: SkillKeywordSearchStrategy;
}

export interface SkillKeywordSearchShadowComparison {
  authoritativeEngine: "like";
  authoritativeResultCount: number;
  candidateEngine: "fts5";
  candidateResultCount: number;
  failed: boolean;
  latencyMs: number;
  topResultOverlap: number;
  topResultSampleSize: number;
  zeroResultChanged: boolean;
}

export interface SkillKeywordSearchQueryFailure {
  engine: "fts5";
  fallbackApplied: boolean;
  latencyMs: number;
  phase: "authoritative" | "shadow";
  strategy: SkillKeywordSearchStrategy;
}

export interface SkillKeywordSearchTelemetry {
  recordQueryFailure?(input: SkillKeywordSearchQueryFailure): Promise<void> | void;
  recordShadowComparison(input: SkillKeywordSearchShadowComparison): Promise<void> | void;
}

export interface SkillKeywordSearchStrategyEnv {
  SKILL_KEYWORD_SEARCH_STRATEGY?: string | null;
}

export const DEFAULT_SKILL_KEYWORD_SEARCH_STRATEGY: SkillKeywordSearchStrategy = "like";

export const parseSkillKeywordSearchStrategy = (
  value: string | null | undefined,
): SkillKeywordSearchStrategy => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "shadow" || normalized === "fts5") {
    return normalized;
  }

  return DEFAULT_SKILL_KEYWORD_SEARCH_STRATEGY;
};

export const getSkillKeywordSearchStrategyConfig = (
  env: SkillKeywordSearchStrategyEnv = {},
): SkillKeywordSearchStrategyConfig => {
  const strategy = parseSkillKeywordSearchStrategy(env.SKILL_KEYWORD_SEARCH_STRATEGY);

  return {
    authoritativeEngine: strategy === "fts5" ? "fts5" : "like",
    shadowCompareFts5: strategy === "shadow",
    strategy,
  };
};
