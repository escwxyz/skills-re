/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

// ---------------------------------------------------------------------------
// We test cookie-consent.ts by mocking the underlying cookies.ts module.
// ---------------------------------------------------------------------------

const mockReadCookie = mock(async (_name: string): Promise<string | undefined> => undefined);
const mockWriteCookie = mock(async (_name: string, _value: string, _opts?: unknown): Promise<void> => {});
const mockClearCookie = mock(async (_name: string): Promise<void> => {});

// Mock the cookies module before importing cookie-consent
mock.module("@/lib/cookies", () => ({
  readCookie: mockReadCookie,
  writeCookie: mockWriteCookie,
  clearCookie: mockClearCookie,
}));

// Import after mocking
const { readCookieConsent, writeCookieConsent, clearCookieConsent, COOKIE_CONSENT_COOKIE_NAME } =
  await import("./cookie-consent");

describe("cookie-consent", () => {
  beforeEach(() => {
    mockReadCookie.mockClear();
    mockWriteCookie.mockClear();
    mockClearCookie.mockClear();
  });

  afterEach(() => {
    mockReadCookie.mockReset();
    mockWriteCookie.mockReset();
    mockClearCookie.mockReset();
  });

  describe("readCookieConsent", () => {
    test("returns 'all' when the cookie value is 'all'", async () => {
      mockReadCookie.mockResolvedValue("all");
      const result = await readCookieConsent();
      expect(result).toBe("all");
      expect(mockReadCookie).toHaveBeenCalledWith(COOKIE_CONSENT_COOKIE_NAME);
    });

    test("returns 'essential' when the cookie value is anything other than 'all'", async () => {
      mockReadCookie.mockResolvedValue("something-else");
      const result = await readCookieConsent();
      expect(result).toBe("essential");
    });

    test("returns 'essential' when the cookie is undefined (not set)", async () => {
      mockReadCookie.mockResolvedValue(undefined);
      const result = await readCookieConsent();
      expect(result).toBe("essential");
    });

    test("returns 'essential' when the cookie value is empty string", async () => {
      mockReadCookie.mockResolvedValue("");
      const result = await readCookieConsent();
      expect(result).toBe("essential");
    });
  });

  describe("writeCookieConsent", () => {
    test("calls writeCookie with the consent cookie name and 'all' choice", async () => {
      await writeCookieConsent("all");
      expect(mockWriteCookie).toHaveBeenCalledTimes(1);
      expect(mockWriteCookie).toHaveBeenCalledWith(
        COOKIE_CONSENT_COOKIE_NAME,
        "all",
        expect.objectContaining({ maxAge: expect.any(Number) }),
      );
    });

    test("calls writeCookie with the consent cookie name and 'essential' choice", async () => {
      await writeCookieConsent("essential");
      expect(mockWriteCookie).toHaveBeenCalledTimes(1);
      expect(mockWriteCookie).toHaveBeenCalledWith(
        COOKIE_CONSENT_COOKIE_NAME,
        "essential",
        expect.objectContaining({ maxAge: expect.any(Number) }),
      );
    });

    test("uses a maxAge of one year (365 days in seconds)", async () => {
      await writeCookieConsent("all");
      const [, , options] = mockWriteCookie.mock.calls[0] as [string, string, { maxAge: number }];
      const oneYearInSeconds = 60 * 60 * 24 * 365;
      expect(options?.maxAge).toBe(oneYearInSeconds);
    });
  });

  describe("clearCookieConsent", () => {
    test("calls clearCookie with the consent cookie name", async () => {
      await clearCookieConsent();
      expect(mockClearCookie).toHaveBeenCalledTimes(1);
      expect(mockClearCookie).toHaveBeenCalledWith(COOKIE_CONSENT_COOKIE_NAME);
    });

    test("does not call writeCookie or readCookie when clearing consent", async () => {
      await clearCookieConsent();
      expect(mockWriteCookie).not.toHaveBeenCalled();
      expect(mockReadCookie).not.toHaveBeenCalled();
    });
  });

  describe("COOKIE_CONSENT_COOKIE_NAME", () => {
    test("is the expected constant value", () => {
      expect(COOKIE_CONSENT_COOKIE_NAME).toBe("cookie_consent");
    });
  });
});