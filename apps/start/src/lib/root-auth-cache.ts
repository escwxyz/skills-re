const ROOT_AUTH_CACHE_TTL_MS = 30_000;

let cachedRootAuth: { expiresAt: number; value: unknown } | null = null;

export const readCachedRootAuth = <T>() => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!cachedRootAuth || cachedRootAuth.expiresAt <= Date.now()) {
    cachedRootAuth = null;
    return null;
  }

  return cachedRootAuth.value as T;
};

export const writeCachedRootAuth = <T>(value: T) => {
  if (typeof window === "undefined") {
    return value;
  }

  cachedRootAuth = {
    expiresAt: Date.now() + ROOT_AUTH_CACHE_TTL_MS,
    value,
  };

  return value;
};

export const clearCachedRootAuth = () => {
  cachedRootAuth = null;
};
