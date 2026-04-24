type WorkerLogPrimitive = boolean | number | string | null;
export interface WorkerErrorLog {
  cause?: unknown;
  message: string;
  name: string;
  stack?: string;
}
export type WorkerLogValue =
  | WorkerLogPrimitive
  | WorkerLogPrimitive[]
  | Record<string, WorkerLogPrimitive | WorkerLogPrimitive[] | undefined>
  | WorkerErrorLog;

export type WorkerLogFields = Record<string, WorkerLogValue | Error | undefined>;

export interface WorkerLogger {
  child(fields: WorkerLogFields): WorkerLogger;
  debug(event: string, fields?: WorkerLogFields): void;
  error(event: string, fields?: WorkerLogFields): void;
  info(event: string, fields?: WorkerLogFields): void;
  warn(event: string, fields?: WorkerLogFields): void;
}

const CYCLIC_CAUSE_SENTINEL = "[cyclic cause]";

const normalizeErrorCause = (cause: unknown, seen: Set<Error>): WorkerLogValue | undefined => {
  if (cause instanceof Error) {
    return normalizeError(cause, seen);
  }

  if (cause === undefined) {
    return undefined;
  }

  return cause as WorkerLogPrimitive | WorkerLogPrimitive[];
};

const normalizeError = (error: Error, seen: Set<Error> = new Set<Error>()): WorkerErrorLog => {
  if (seen.has(error)) {
    return {
      cause: CYCLIC_CAUSE_SENTINEL,
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  seen.add(error);

  return {
    cause: normalizeErrorCause(error.cause, seen),
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
};

const normalizeFields = (fields: WorkerLogFields) => {
  const normalized: Record<string, WorkerLogValue | undefined> = {};

  for (const [key, value] of Object.entries(fields)) {
    normalized[key] = value instanceof Error ? normalizeError(value) : value;
  }

  return normalized;
};

const writeStructuredLog = (
  level: "debug" | "error" | "info" | "warn",
  normalizedBaseFields: Record<string, WorkerLogValue | undefined>,
  event: string,
  fields: WorkerLogFields = {},
) => {
  const payload = {
    ...normalizedBaseFields,
    ...normalizeFields(fields),
    event,
    level,
  };

  console[level](payload);
};

export const createWorkerLogger = (baseFields: WorkerLogFields = {}): WorkerLogger => {
  const normalizedBaseFields = normalizeFields(baseFields);

  return {
    child(fields) {
      return createWorkerLogger({
        ...baseFields,
        ...fields,
      });
    },
    debug(event, fields) {
      writeStructuredLog("debug", normalizedBaseFields, event, fields);
    },
    error(event, fields) {
      writeStructuredLog("error", normalizedBaseFields, event, fields);
    },
    info(event, fields) {
      writeStructuredLog("info", normalizedBaseFields, event, fields);
    },
    warn(event, fields) {
      writeStructuredLog("warn", normalizedBaseFields, event, fields);
    },
  };
};
