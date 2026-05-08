import type { WorkerLogger } from "../../types";

const normalizeUnknownError = (error: unknown) => {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
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
  fields?: Record<string, unknown>;
  logger?: WorkerLogger;
}) => {
  const payload = {
    component: input.component ?? "app",
    error: normalizeUnknownError(input.error),
    event: input.event,
    level: "error" as const,
    ...input.fields,
  };

  if (input.logger) {
    input.logger.error(input.event, {
      ...input.fields,
      error: payload.error,
    });
    return;
  }

  console.error(payload);
};
