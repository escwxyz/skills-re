import type { AiWorkflowRateLimitReservation } from "@/dos/ai-workflow-rate-limiter";
import type { AiSearchUploadRateLimitReservation } from "@/dos/ai-search-upload-rate-limiter";
import type { StaticAuditDispatchRateLimitReservation } from "@/dos/static-audit-dispatch-rate-limiter";

export interface WorkflowRateLimiterNamespace {
  get(id: unknown): {
    fetch(request: Request): Promise<Response>;
  };
  idFromName(name: string): unknown;
}

export interface WorkflowRateLimitOptions {
  dailyLimit: number;
  namespace?: WorkflowRateLimiterNamespace;
  scope: string;
  spacingMs: number;
  units?: number;
}

const DEFAULT_RESERVATION:
  | AiWorkflowRateLimitReservation
  | AiSearchUploadRateLimitReservation
  | StaticAuditDispatchRateLimitReservation = {
  delaySeconds: 0,
  notBeforeMs: 0,
};

export const reserveWorkflowRateLimitSlot = async ({
  dailyLimit,
  namespace,
  scope,
  spacingMs,
  units = 1,
}: WorkflowRateLimitOptions): Promise<
  | AiWorkflowRateLimitReservation
  | AiSearchUploadRateLimitReservation
  | StaticAuditDispatchRateLimitReservation
> => {
  if (!namespace) {
    return DEFAULT_RESERVATION;
  }

  const stub = namespace.get(namespace.idFromName(scope));
  const response = await stub.fetch(
    new Request("https://workflow-rate-limiter/reserve", {
      body: JSON.stringify({
        dailyLimit,
        spacingMs,
        units,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );

  if (!response.ok) {
    throw new Error(`Workflow rate limiter failed with status ${response.status}.`);
  }

  return (await response.json()) as
    | AiWorkflowRateLimitReservation
    | AiSearchUploadRateLimitReservation
    | StaticAuditDispatchRateLimitReservation;
};
