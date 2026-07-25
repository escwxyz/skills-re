export const SKILL_FTS_MAX_QUERY_CHARS = 256;
export const SKILL_FTS_MAX_QUERY_TOKENS = 8;

const SEARCH_TOKEN_REGEX = /[\p{Letter}\p{Number}]+/gu;

export interface SkillFtsMatchQuery {
  expression: string;
  isTruncated: boolean;
  tokens: string[];
}

const quoteFtsToken = (token: string) => `"${token.replaceAll('"', '""')}"*`;

export const buildSkillFtsMatchQuery = (input: string): SkillFtsMatchQuery | null => {
  const normalized = input.normalize("NFKC").trim().slice(0, SKILL_FTS_MAX_QUERY_CHARS);
  if (!normalized) {
    return null;
  }

  const tokens: string[] = [];
  for (const match of normalized.matchAll(SEARCH_TOKEN_REGEX)) {
    tokens.push(match[0]);
    if (tokens.length >= SKILL_FTS_MAX_QUERY_TOKENS) {
      break;
    }
  }

  if (tokens.length === 0) {
    return null;
  }

  const isTruncated =
    input.normalize("NFKC").trim().length > SKILL_FTS_MAX_QUERY_CHARS ||
    [...normalized.matchAll(SEARCH_TOKEN_REGEX)].length > tokens.length;

  return {
    expression: tokens.map(quoteFtsToken).join(" "),
    isTruncated,
    tokens,
  };
};
