/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  COOKIE_PREFERENCES_COOKIE_NAME,
  getCookiePreferencesSync,
  hasFunctionalCookieConsentSync,
  parseCookiePreferences,
  persistCookiePreferences,
} from "./cookies";

const setDocument = (cookie: string) => {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      get cookie() {
        return cookie;
      },
      set cookie(value: string) {
        cookie = value;
      },
    },
    writable: true,
  });
};

describe("cookie preferences", () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    setDocument("");
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
      writable: true,
    });
  });

  test("parses the functional preference from stored JSON", () => {
    expect(parseCookiePreferences(JSON.stringify({ analytics: false, functional: false }))).toEqual(
      {
        analytics: false,
        functional: false,
      },
    );
  });

  test("persists the functional preference instead of forcing it to true", () => {
    persistCookiePreferences({ analytics: false, functional: false }, 10);

    expect(globalThis.document.cookie).toContain(COOKIE_PREFERENCES_COOKIE_NAME);
    expect(globalThis.document.cookie).toContain('"functional":false');
    expect(globalThis.document.cookie).toContain('"analytics":false');
  });

  test("reads functional consent from the stored cookie", () => {
    setDocument(
      `${COOKIE_PREFERENCES_COOKIE_NAME}=${JSON.stringify({ analytics: true, functional: false })}`,
    );

    expect(getCookiePreferencesSync()).toEqual({
      analytics: true,
      functional: false,
    });
    expect(hasFunctionalCookieConsentSync()).toBe(false);
  });
});
