import { setTimeout as sleep } from "node:timers/promises";

const RATE_LIMIT_ERROR_HINTS = [
  "429",
  "rate limit",
  "quota",
  "too many requests",
  "resource exhausted",
  "capacity",
  "daily limit",
];

export const isAiQuotaOrRateLimitError = (error: unknown) => {
  const maybe = error as
    | {
        message?: string;
        response?: { status?: number };
        status?: number;
        statusCode?: number;
      }
    | undefined;

  const statusCode = maybe?.statusCode ?? maybe?.status ?? maybe?.response?.status;
  if (statusCode === 429) {
    return true;
  }

  const text = [maybe?.message, JSON.stringify(error)].filter(Boolean).join(" ").toLowerCase();
  return RATE_LIMIT_ERROR_HINTS.some((hint) => text.includes(hint));
};

export const retryAiTaskCall = async <T>(
  run: () => Promise<T>,
  input?: {
    maxAttempts?: number;
    retryDelayMs?: number;
  },
) => {
  const maxAttempts = input?.maxAttempts ?? 2;
  const retryDelayMs = input?.retryDelayMs ?? 250;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isAiQuotaOrRateLimitError(error)) {
        throw error;
      }

      await sleep(retryDelayMs * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI task call failed.");
};
