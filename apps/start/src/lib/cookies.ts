// 90 days in seconds
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_NINETY_DAY_PERIOD = 90;
const DEFAULT_MAX_AGE =
  SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY * DAYS_PER_NINETY_DAY_PERIOD;

export const COOKIE_CONSENT_COOKIE_NAME = "cookieConsent";
export const COOKIE_PREFERENCES_COOKIE_NAME = "cookiePreferences";
export const COOKIE_PREFERENCES_UPDATED_EVENT = "cookie-preferences-updated";

export interface CookiePreferences {
  functional: boolean;
  analytics: boolean;
}

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  functional: true,
  analytics: true,
};

export function parseCookiePreferences(rawValue: string): CookiePreferences | null {
  try {
    const parsed = JSON.parse(rawValue);
    const analytics =
      typeof parsed.analytics === "boolean"
        ? parsed.analytics
        : DEFAULT_COOKIE_PREFERENCES.analytics;

    return {
      analytics,
      functional: true,
    };
  } catch {
    return null;
  }
}

export async function getCookiePreferences(): Promise<CookiePreferences | null> {
  const storedPreferences = await readCookie(COOKIE_PREFERENCES_COOKIE_NAME);
  if (!storedPreferences) {
    return null;
  }

  return parseCookiePreferences(storedPreferences);
}

const dispatchCookiePreferencesUpdated = (preferences: CookiePreferences): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<CookiePreferences>(COOKIE_PREFERENCES_UPDATED_EVENT, {
      detail: preferences,
    }),
  );
};

export function persistCookiePreferences(
  preferences: CookiePreferences,
  maxAge: number = DEFAULT_MAX_AGE,
): void {
  const normalizedPreferences: CookiePreferences = {
    analytics: preferences.analytics,
    functional: true,
  };

  writeCookie(COOKIE_PREFERENCES_COOKIE_NAME, JSON.stringify(normalizedPreferences), { maxAge });
  writeCookie(COOKIE_CONSENT_COOKIE_NAME, "preferences-set", {
    maxAge,
  });
  dispatchCookiePreferencesUpdated(normalizedPreferences);
}

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

export async function clearCookiePreferences(): Promise<void> {
  await clearCookie(COOKIE_PREFERENCES_COOKIE_NAME);
  await clearCookie(COOKIE_CONSENT_COOKIE_NAME);
  dispatchCookiePreferencesUpdated({ analytics: false, functional: true });
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
