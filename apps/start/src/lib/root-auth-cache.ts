const ROOT_AUTH_CACHE_TTL_MS = 30_000;
const AUTH_COOKIE_PREFIX = "skills-re.";

let cachedRootAuth: {
  authCookieSignature: string | null;
  expiresAt: number;
  value: unknown;
} | null = null;

const normalizeAuthCookieSignature = (cookieHeader: string) => {
  const cookies = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return null;
      }

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();

      if (!name.startsWith(AUTH_COOKIE_PREFIX)) {
        return null;
      }

      return `${name}=${value}`;
    })
    .filter(Boolean)
    .toSorted();

  return cookies.length > 0 ? cookies.join(";") : null;
};

export const getCurrentAuthCookieSignature = () => {
  if (typeof document === "undefined") {
    return null;
  }

  return normalizeAuthCookieSignature(document.cookie);
};

export const readCachedRootAuth = <T>(authCookieSignature: string | null) => {
  if (typeof window === "undefined") {
    return null;
  }

  if (
    !cachedRootAuth ||
    cachedRootAuth.expiresAt <= Date.now() ||
    cachedRootAuth.authCookieSignature !== authCookieSignature
  ) {
    cachedRootAuth = null;
    return null;
  }

  return cachedRootAuth.value as T;
};

export const writeCachedRootAuth = <T>(authCookieSignature: string | null, value: T) => {
  if (typeof window === "undefined") {
    return value;
  }

  cachedRootAuth = {
    authCookieSignature,
    expiresAt: Date.now() + ROOT_AUTH_CACHE_TTL_MS,
    value,
  };

  return value;
};

export const clearCachedRootAuth = () => {
  cachedRootAuth = null;
};
