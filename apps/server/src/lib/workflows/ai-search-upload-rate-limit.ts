import { parsePositiveInteger } from "@/utils";
import { reserveWorkflowRateLimitSlot } from "./rate-limit-reservation";
import type {
  WorkflowRateLimiterNamespace,
  WorkflowRateLimitOptions,
} from "./rate-limit-reservation";

const DEFAULT_AI_SEARCH_UPLOAD_SPACING_SECONDS = 2;
const DEFAULT_AI_SEARCH_UPLOAD_DAILY_LIMIT = 10_000;

interface AiSearchUploadRateLimitEnv {
  AI_SEARCH_UPLOAD_RATE_LIMITER?: WorkflowRateLimiterNamespace;
  AI_SEARCH_UPLOAD_DAILY_LIMIT?: string;
  AI_SEARCH_UPLOAD_SPACING_SECONDS?: string;
}

export const reserveAiSearchUploadSlot = async (
  env: AiSearchUploadRateLimitEnv,
  input: Pick<WorkflowRateLimitOptions, "units"> = {},
) =>
  await reserveWorkflowRateLimitSlot({
    dailyLimit: parsePositiveInteger(
      env.AI_SEARCH_UPLOAD_DAILY_LIMIT,
      DEFAULT_AI_SEARCH_UPLOAD_DAILY_LIMIT,
    ),
    namespace: env.AI_SEARCH_UPLOAD_RATE_LIMITER,
    scope: "ai-search-upload",
    spacingMs:
      parsePositiveInteger(
        env.AI_SEARCH_UPLOAD_SPACING_SECONDS,
        DEFAULT_AI_SEARCH_UPLOAD_SPACING_SECONDS,
      ) * 1000,
    units: input.units,
  });
