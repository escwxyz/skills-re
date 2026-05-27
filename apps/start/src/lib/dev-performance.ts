const isDevelopment = process.env.NODE_ENV !== "production";

const callCounts = new Map<string, number>();

const getNow = () => globalThis.performance?.now() ?? Date.now();

const formatDuration = (durationMs: number) =>
  durationMs >= 100 ? `${durationMs.toFixed(0)}ms` : `${durationMs.toFixed(1)}ms`;

const nextCallCount = (name: string) => {
  const count = (callCounts.get(name) ?? 0) + 1;
  callCounts.set(name, count);
  return count;
};

export const measureAsync = async <T>(
  name: string,
  details: Record<string, unknown>,
  operation: () => Promise<T>,
): Promise<T> => {
  if (!isDevelopment) {
    return operation();
  }

  const call = nextCallCount(name);
  const startedAt = getNow();

  try {
    return await operation();
  } finally {
    const durationMs = getNow() - startedAt;
    console.info(`[perf] ${name}#${call} ${formatDuration(durationMs)}`, details);
  }
};
