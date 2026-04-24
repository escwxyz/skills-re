import { clearCookie, readCookie, writeCookie } from "@/lib/cookies";

export const COOKIE_CONSENT_COOKIE_NAME = "cookie_consent";

export type CookieConsentChoice = "essential" | "all";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function readCookieConsent(): Promise<CookieConsentChoice> {
  return (await readCookie(COOKIE_CONSENT_COOKIE_NAME)) === "all" ? "all" : "essential";
}

export async function writeCookieConsent(choice: CookieConsentChoice): Promise<void> {
  await writeCookie(COOKIE_CONSENT_COOKIE_NAME, choice, { maxAge: MAX_AGE_SECONDS });
}

export async function clearCookieConsent(): Promise<void> {
  await clearCookie(COOKIE_CONSENT_COOKIE_NAME);
}
