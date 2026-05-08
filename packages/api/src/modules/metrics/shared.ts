const METRICS_CACHE_TTL_SECONDS = 300;
const DAILY_COUNTER_TTL_SECONDS = 14 * 24 * 60 * 60;
const WEEK_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface SkillMetricsResult {
  allTime: number;
  daily: number;
  updatedAt: string;
  weekly: number;
}

export const toDayBucket = (timeMs: number) => new Date(timeMs).toISOString().slice(0, 10);

export const listRecentDayBuckets = (days: number, nowMs = Date.now()) => {
  const now = new Date(nowMs);
  const startOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return Array.from({ length: days }, (_, offset) =>
    toDayBucket(startOfTodayUtc - offset * DAY_IN_MS),
  );
};

export const getMetricsCacheKey = (scope: string, skillId: string) =>
  `skill:${scope}:v1:${skillId}`;

export const getDailyCounterKey = (scope: string, skillId: string, day: string) =>
  `skill:${scope}-daily:${skillId}:${day}`;

export const toCounterValue = (value: string | null) => {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const queryWeeklyDailyFromKv = async (
  kv: KVNamespace | null,
  cachePrefix: string,
  skillId: string,
  nowMs = Date.now(),
) => {
  if (!kv) {
    return {
      daily: 0,
      weekly: 0,
    };
  }

  const dayBuckets = listRecentDayBuckets(WEEK_DAYS, nowMs);
  const counterKeys = dayBuckets.map((day) => getDailyCounterKey(cachePrefix, skillId, day));
  const values = await Promise.all(counterKeys.map((key) => kv.get(key)));

  const daily = toCounterValue(values[0] ?? null);
  const weekly = values.reduce((sum, value) => sum + toCounterValue(value), 0);

  return {
    daily,
    weekly,
  };
};

export const incrementKvDailyCounter = async (
  kv: KVNamespace | null,
  cachePrefix: string,
  skillId: string,
  nowMs = Date.now(),
) => {
  if (!kv) {
    return;
  }

  const day = toDayBucket(nowMs);
  const dayCounterKey = getDailyCounterKey(cachePrefix, skillId, day);
  const currentValue = toCounterValue(await kv.get(dayCounterKey));

  await kv.put(dayCounterKey, String(currentValue + 1), {
    expirationTtl: DAILY_COUNTER_TTL_SECONDS,
  });
};

export const readMetricsCache = async <T>(kv: KVNamespace | null, cacheKey: string) => {
  if (!kv) {
    return null;
  }

  try {
    return await kv.get<T>(cacheKey, "json");
  } catch {
    return null;
  }
};

export const writeMetricsCache = async <T>(kv: KVNamespace | null, cacheKey: string, value: T) => {
  if (!kv) {
    return;
  }

  await kv.put(cacheKey, JSON.stringify(value), {
    expirationTtl: METRICS_CACHE_TTL_SECONDS,
  });
};

export const deleteMetricsCache = async (kv: KVNamespace | null, cacheKey: string) => {
  if (!kv) {
    return;
  }

  await kv.delete(cacheKey);
};

export const metricsCacheTtlSeconds = METRICS_CACHE_TTL_SECONDS;
export const dailyCounterTtlSeconds = DAILY_COUNTER_TTL_SECONDS;
