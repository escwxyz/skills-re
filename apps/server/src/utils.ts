export const getUtcDayKey = (timeMs: number) => new Date(timeMs).toISOString().slice(0, 10);

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const parsePositiveInteger = (value: unknown, fallback: number) => {
  if (typeof value !== "number" && typeof value !== "string") {
    return fallback;
  }

  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.trunc(parsed));
};
