/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { clearCookie, readCookie, writeCookie } from "./cookies";

// ---------------------------------------------------------------------------
// Helpers to simulate browser and SSR environments
// ---------------------------------------------------------------------------

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

const restoreGlobals = () => {
  if (originalWindow === undefined) {
    // @ts-expect-error -- restoring undefined
    globalThis.window = undefined;
  } else {
    globalThis.window = originalWindow;
  }
  if (originalDocument === undefined) {
    // @ts-expect-error -- restoring undefined
    globalThis.document = undefined;
  } else {
    globalThis.document = originalDocument;
  }
};

/**
 * Sets up a minimal browser-like environment backed by a mutable cookie jar
 * and an optional mock cookieStore.
 */
const setupBrowserEnv = (
  options: {
    withCookieStore?: boolean;
    cookieStoreShouldThrow?: boolean;
  } = {},
) => {
  let cookieJar = "";

  const mockDocument = {
    get cookie() {
      return cookieJar;
    },
    set cookie(value: string) {
      // Simulate simplified cookie setting (real browsers handle max-age internally)
      const [pair] = value.split(";");
      if (!pair) return;
      const [rawName, rawValue] = pair.split("=");
      const name = rawName?.trim();
      const val = rawValue?.trim() ?? "";

      if (val === "" && value.includes("max-age=0")) {
        // Delete the cookie
        const re = new RegExp(`(?:^|; )${name}=[^;]*`);
        cookieJar = cookieJar.replace(re, "").replace(/^; /, "").replace(/; ; /, "; ");
        return;
      }

      // Upsert
      if (cookieJar.includes(`${name}=`)) {
        cookieJar = cookieJar.replace(new RegExp(`${name}=[^;]*`), `${name}=${val}`);
      } else {
        cookieJar = cookieJar ? `${cookieJar}; ${name}=${val}` : `${name}=${val}`;
      }
    },
  };

  const cookieStoreData = new Map<string, string>();

  const mockCookieStore = options.withCookieStore
    ? {
        get: async (name: string) => {
          if (options.cookieStoreShouldThrow) {
            throw new Error("cookieStore.get failed");
          }
          const value = cookieStoreData.get(name);
          return value !== undefined ? { name, value } : undefined;
        },
        set: async (opts: { name: string; value: string; expires?: number }) => {
          if (options.cookieStoreShouldThrow) {
            throw new Error("cookieStore.set failed");
          }
          cookieStoreData.set(opts.name, opts.value);
        },
        delete: async (name: string) => {
          if (options.cookieStoreShouldThrow) {
            throw new Error("cookieStore.delete failed");
          }
          cookieStoreData.delete(name);
        },
      }
    : undefined;

  const mockWindow = {
    ...(options.withCookieStore ? { cookieStore: mockCookieStore } : {}),
  };

  // @ts-expect-error -- mocking browser globals
  globalThis.window = mockWindow;
  // @ts-expect-error -- mocking browser globals
  globalThis.document = mockDocument;

  return { cookieJar: () => cookieJar, cookieStoreData };
};

// ---------------------------------------------------------------------------
// SSR / non-browser environment
// ---------------------------------------------------------------------------

describe("cookies (SSR – window undefined)", () => {
  beforeEach(() => {
    // @ts-expect-error -- simulate SSR
    globalThis.window = undefined;
  });

  afterEach(restoreGlobals);

  test("readCookie returns undefined when window is not defined", async () => {
    await expect(readCookie("my-cookie")).resolves.toBeUndefined();
  });

  test("writeCookie does nothing when window is not defined", async () => {
    await expect(writeCookie("my-cookie", "value")).resolves.toBeUndefined();
  });

  test("clearCookie does nothing when window is not defined", async () => {
    await expect(clearCookie("my-cookie")).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Browser environment with cookieStore API
// ---------------------------------------------------------------------------

describe("cookies (browser with cookieStore)", () => {
  afterEach(restoreGlobals);

  test("writeCookie stores via cookieStore and readCookie retrieves it", async () => {
    setupBrowserEnv({ withCookieStore: true });

    await writeCookie("test-key", "test-value");
    const result = await readCookie("test-key");
    expect(result).toBe("test-value");
  });

  test("clearCookie removes the cookie via cookieStore", async () => {
    const { cookieStoreData } = setupBrowserEnv({ withCookieStore: true });
    cookieStoreData.set("to-delete", "some-value");

    await clearCookie("to-delete");
    const result = await readCookie("to-delete");
    expect(result).toBeUndefined();
  });

  test("readCookie returns undefined for a missing cookie", async () => {
    setupBrowserEnv({ withCookieStore: true });

    const result = await readCookie("nonexistent");
    expect(result).toBeUndefined();
  });

  test("writeCookie uses provided maxAge option", async () => {
    const { cookieStoreData } = setupBrowserEnv({ withCookieStore: true });

    await writeCookie("maxage-key", "v", { maxAge: 3600 });
    // cookieStore.set was called; value should be present
    expect(cookieStoreData.get("maxage-key")).toBe("v");
  });
});

// ---------------------------------------------------------------------------
// Browser environment with document.cookie fallback (no cookieStore)
// ---------------------------------------------------------------------------

describe("cookies (browser fallback via document.cookie)", () => {
  afterEach(restoreGlobals);

  test("writeCookie sets document.cookie and readCookie parses it back", async () => {
    setupBrowserEnv({ withCookieStore: false });

    await writeCookie("fallback-key", "fallback-value");
    const result = await readCookie("fallback-key");
    expect(result).toBe("fallback-value");
  });

  test("clearCookie sets max-age=0 in document.cookie", async () => {
    setupBrowserEnv({ withCookieStore: false });

    await writeCookie("clear-me", "some-val");
    await clearCookie("clear-me");
    const result = await readCookie("clear-me");
    expect(result).toBeUndefined();
  });

  test("readCookie returns undefined when the cookie is not in document.cookie", async () => {
    setupBrowserEnv({ withCookieStore: false });
    const result = await readCookie("no-such-cookie");
    expect(result).toBeUndefined();
  });

  test("readCookie handles multiple cookies in the jar", async () => {
    setupBrowserEnv({ withCookieStore: false });

    await writeCookie("alpha", "1");
    await writeCookie("beta", "2");

    expect(await readCookie("alpha")).toBe("1");
    expect(await readCookie("beta")).toBe("2");
  });
});

// ---------------------------------------------------------------------------
// Browser environment where cookieStore throws (falls back to document.cookie)
// ---------------------------------------------------------------------------

describe("cookies (cookieStore throws – fallback to document.cookie)", () => {
  afterEach(restoreGlobals);

  test("writeCookie falls back to document.cookie when cookieStore.set throws", async () => {
    setupBrowserEnv({ withCookieStore: true, cookieStoreShouldThrow: true });

    await writeCookie("fb-key", "fb-val");
    // cookieStore threw, so value should be in document.cookie via fallback
    const result = await readCookie("fb-key");
    // readCookie also falls back to document.cookie (cookieStore throws on get)
    expect(result).toBe("fb-val");
  });

  test("clearCookie falls back to document.cookie when cookieStore.delete throws", async () => {
    setupBrowserEnv({ withCookieStore: true, cookieStoreShouldThrow: true });

    // Write via fallback first
    await writeCookie("del-key", "del-val");
    await clearCookie("del-key");
    const result = await readCookie("del-key");
    expect(result).toBeUndefined();
  });
});