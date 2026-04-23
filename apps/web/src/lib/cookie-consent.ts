import { clearCookie, readCookie, writeCookie } from "@/lib/cookies";

export const COOKIE_CONSENT_COOKIE_NAME = "cookie_consent";

export type CookieConsentChoice = "essential" | "all";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function readCookieConsent(): CookieConsentChoice {
  return readCookie(COOKIE_CONSENT_COOKIE_NAME) === "all" ? "all" : "essential";
}

export function writeCookieConsent(choice: CookieConsentChoice) {
  writeCookie(COOKIE_CONSENT_COOKIE_NAME, choice, {
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearCookieConsent() {
  clearCookie(COOKIE_CONSENT_COOKIE_NAME);
}
