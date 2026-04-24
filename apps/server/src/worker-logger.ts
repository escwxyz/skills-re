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

const normalizeError = (error: Error): WorkerErrorLog => ({
  cause: error.cause instanceof Error ? normalizeError(error.cause) : error.cause,
  message: error.message,
  name: error.name,
  stack: error.stack,
});

const normalizeFields = (fields: WorkerLogFields) => {
  const normalized: Record<string, WorkerLogValue | undefined> = {};

  for (const [key, value] of Object.entries(fields)) {
    const fieldValue = value as WorkerLogValue | Error | undefined;
    normalized[key] = fieldValue instanceof Error ? normalizeError(fieldValue) : fieldValue;
  }

  return normalized;
};

const writeStructuredLog = (
  level: "debug" | "error" | "info" | "warn",
  baseFields: WorkerLogFields,
  event: string,
  fields: WorkerLogFields = {},
) => {
  const payload = {
    ...normalizeFields(baseFields),
    ...normalizeFields(fields),
    event,
    level,
  };

  console[level](payload);
};

export const createWorkerLogger = (baseFields: WorkerLogFields = {}): WorkerLogger => ({
  child(fields) {
    return createWorkerLogger({
      ...baseFields,
      ...fields,
    });
  },
  debug(event, fields) {
    writeStructuredLog("debug", baseFields, event, fields);
  },
  error(event, fields) {
    writeStructuredLog("error", baseFields, event, fields);
  },
  info(event, fields) {
    writeStructuredLog("info", baseFields, event, fields);
  },
  warn(event, fields) {
    writeStructuredLog("warn", baseFields, event, fields);
  },
});
