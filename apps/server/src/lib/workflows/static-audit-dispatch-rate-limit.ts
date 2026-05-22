import { parsePositiveInteger } from "@/utils";
import { reserveWorkflowRateLimitSlot } from "./rate-limit-reservation";
import type {
  WorkflowRateLimiterNamespace,
  WorkflowRateLimitOptions,
} from "./rate-limit-reservation";

const DEFAULT_STATIC_AUDIT_DISPATCH_SPACING_SECONDS = 60;
const DEFAULT_STATIC_AUDIT_DISPATCH_DAILY_LIMIT = 1000;

interface StaticAuditDispatchRateLimitEnv {
  STATIC_AUDIT_DISPATCH_DAILY_LIMIT?: string;
  STATIC_AUDIT_DISPATCH_RATE_LIMITER?: WorkflowRateLimiterNamespace;
  STATIC_AUDIT_DISPATCH_SPACING_SECONDS?: string;
}

export const reserveStaticAuditDispatchSlot = async (
  env: StaticAuditDispatchRateLimitEnv,
  input: Pick<WorkflowRateLimitOptions, "units"> = {},
) =>
  await reserveWorkflowRateLimitSlot({
    dailyLimit: parsePositiveInteger(
      env.STATIC_AUDIT_DISPATCH_DAILY_LIMIT,
      DEFAULT_STATIC_AUDIT_DISPATCH_DAILY_LIMIT,
    ),
    namespace: env.STATIC_AUDIT_DISPATCH_RATE_LIMITER,
    scope: "static-audit-dispatch",
    spacingMs:
      parsePositiveInteger(
        env.STATIC_AUDIT_DISPATCH_SPACING_SECONDS,
        DEFAULT_STATIC_AUDIT_DISPATCH_SPACING_SECONDS,
      ) * 1000,
    units: input.units,
  });
