// 7 days in seconds
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7;

export interface WriteCookieOptions {
  maxAge?: number;
}

export async function readCookie(name: string): Promise<string | undefined> {
  if (typeof window === "undefined") {
    return undefined;
  }

  if ("cookieStore" in window) {
    try {
      const cookie = await window.cookieStore.get(name);
      return cookie?.value;
    } catch {
      // fallback below
    }
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
}

export async function writeCookie(
  name: string,
  value: string,
  options: WriteCookieOptions = {},
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const maxAge = options.maxAge ?? DEFAULT_MAX_AGE;

  if ("cookieStore" in window) {
    try {
      await window.cookieStore.set({
        name,
        value,
        expires: Date.now() + maxAge * 1000,
      });
      return;
    } catch {
      // fallback below
    }
  }

  // oxlint-disable-next-line unicorn/no-document-cookie fallback
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
}

export async function clearCookie(name: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if ("cookieStore" in window) {
    try {
      await window.cookieStore.delete(name);
      return;
    } catch {
      // fallback below
    }
  }

  // oxlint-disable-next-line unicorn/no-document-cookie fallback
  document.cookie = `${name}=; path=/; max-age=0`;
}
