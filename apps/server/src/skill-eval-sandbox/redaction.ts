import type { SkillEvalRunEvent } from "./events";

export const DEFAULT_EVENT_STRING_LIMIT = 4000;
export const DEFAULT_LOG_CHUNK_LIMIT = 32_000;

const REDACTION_PATTERNS: [RegExp, string][] = [
  [/\b(authorization:\s*bearer\s+)[^\s]+/gi, "$1[REDACTED]"],
  [
    /\b((?:[a-z0-9]+[_-])*?(?:api[_-]?key|token|secret|password)\s*[:=]\s*)[^\s'",}]+/gi,
    "$1[REDACTED]",
  ],
  [/\b(sk-[a-zA-Z0-9_-]{12,})\b/g, "[REDACTED]"],
];

export const redactSkillEvalText = (value: string) => {
  let redacted = value;

  for (const [pattern, replacement] of REDACTION_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }

  return redacted;
};

export const truncateSkillEvalText = (value: string, maxChars: number) => {
  if (value.length <= maxChars) {
    return {
      text: value,
      truncated: false,
    };
  }

  return {
    text: `${value.slice(0, maxChars)}...[truncated]`,
    truncated: true,
  };
};

export const sanitizeSkillEvalText = (value: string, maxChars = DEFAULT_EVENT_STRING_LIMIT) =>
  truncateSkillEvalText(redactSkillEvalText(value), maxChars);

const sanitizeUnknown = (value: unknown, maxChars: number): unknown => {
  if (typeof value === "string") {
    return sanitizeSkillEvalText(value, maxChars).text;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item, maxChars));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeUnknown(item, maxChars)]),
    );
  }
  return value;
};

export const sanitizeSkillEvalRunEvent = (
  event: SkillEvalRunEvent,
  maxChars = DEFAULT_EVENT_STRING_LIMIT,
): SkillEvalRunEvent => {
  if (event.kind === "stdout" || event.kind === "stderr") {
    const sanitizedChunk = sanitizeSkillEvalText(event.payload.chunk, maxChars);
    return {
      ...event,
      message: event.message ? sanitizeSkillEvalText(event.message, maxChars).text : undefined,
      payload: {
        ...event.payload,
        chunk: sanitizedChunk.text,
        truncated: event.payload.truncated || sanitizedChunk.truncated,
      },
    };
  }

  const sanitized = {
    ...event,
    message: event.message ? sanitizeSkillEvalText(event.message, maxChars).text : undefined,
    payload: sanitizeUnknown(event.payload, maxChars),
  } as SkillEvalRunEvent;

  return sanitized;
};

export const sanitizeSkillEvalLogChunk = (chunk: string, maxChars = DEFAULT_LOG_CHUNK_LIMIT) =>
  sanitizeSkillEvalText(chunk, maxChars);
