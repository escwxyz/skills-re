const JSON_CODE_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;

export const parseJsonFromModelText = (text: string) => {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(JSON_CODE_FENCE_PATTERN);
  const withoutFence = fenceMatch?.[1]?.trim() ?? trimmed;
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  const braceSlice =
    firstBrace !== -1 && lastBrace > firstBrace
      ? withoutFence.slice(firstBrace, lastBrace + 1)
      : withoutFence;

  const parseCandidates = [trimmed, withoutFence, braceSlice];
  for (const candidate of parseCandidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Try the next normalized candidate.
    }
  }

  throw new Error("Model returned invalid JSON after fence/braces normalization.");
};
