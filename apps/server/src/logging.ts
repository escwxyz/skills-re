import * as z from "zod";

import { createWorkerLogger } from "./worker-logger";
import type { WorkerLogFields, WorkerLogger } from "./worker-logger";

export const createHttpRequestLogger = (input: {
  method: string;
  path: string;
  requestId: string;
}) =>
  createWorkerLogger({
    component: "http",
    method: input.method,
    path: input.path,
    requestId: input.requestId,
  });

export const createWorkflowQueueLogger = () =>
  createWorkerLogger({
    component: "workflow.queue",
  });

export const normalizeUnknownError = (error: unknown) => {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const cause = record.cause as { issues?: unknown } | undefined;
    if (cause && Array.isArray(cause.issues)) {
      try {
        const zodError = new z.ZodError(cause.issues as z.core.$ZodIssue[]);
        const message =
          typeof record.message === "string" && record.message
            ? `${record.message}: ${z.prettifyError(zodError)}`
            : z.prettifyError(zodError);
        return Object.assign(new Error(message), { cause: error });
      } catch {
        // Fall through to the generic normalization below.
      }
    }

    const message =
      typeof record.message === "string" && record.message
        ? record.message
        : "Non-Error value thrown";
    return Object.assign(new Error(message), { cause: error });
  }

  return new Error(String(error));
};

export const logHandledError = (input: {
  component?: string;
  error: unknown;
  event: string;
  fields?: WorkerLogFields;
  logger?: WorkerLogger;
}) => {
  const logger =
    input.logger ??
    createWorkerLogger({
      component: input.component ?? "app",
    });

  logger.error(input.event, {
    ...input.fields,
    error: normalizeUnknownError(input.error),
  });
};
