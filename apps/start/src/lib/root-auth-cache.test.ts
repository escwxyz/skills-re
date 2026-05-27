/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  clearCachedRootAuth,
  getCurrentAuthCookieSignature,
  readCachedRootAuth,
  writeCachedRootAuth,
} from "./root-auth-cache";

const setWindow = (value: Window | undefined) => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value,
    writable: true,
  });
};

const setDocument = (cookie: string | undefined) => {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: cookie === undefined ? undefined : { cookie },
    writable: true,
  });
};

describe("root auth cache", () => {
  let originalWindow: typeof globalThis.window;
  let originalDocument: typeof globalThis.document;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    clearCachedRootAuth();
  });

  afterEach(() => {
    clearCachedRootAuth();
    setWindow(originalWindow);
    setDocument(originalDocument?.cookie);
  });

  test("stores and reads auth state on the client", () => {
    setWindow({} as Window);
    setDocument("skills-re.session_token=abc; other=value");

    writeCachedRootAuth(getCurrentAuthCookieSignature(), {
      currentUser: { id: "user-1" },
      isAdmin: false,
    });

    expect(
      readCachedRootAuth<{ currentUser: { id: string } | null; isAdmin: boolean }>(
        getCurrentAuthCookieSignature(),
      ),
    ).toEqual({
      currentUser: { id: "user-1" },
      isAdmin: false,
    });
  });

  test("clears auth state explicitly", () => {
    setWindow({} as Window);
    setDocument("skills-re.session_token=abc");

    writeCachedRootAuth(getCurrentAuthCookieSignature(), {
      currentUser: { id: "user-1" },
      isAdmin: true,
    });
    clearCachedRootAuth();

    expect(readCachedRootAuth(getCurrentAuthCookieSignature())).toBeNull();
  });

  test("does not cache on the server", () => {
    setWindow(undefined);
    setDocument(undefined);

    writeCachedRootAuth(getCurrentAuthCookieSignature(), {
      currentUser: { id: "user-1" },
      isAdmin: true,
    });

    expect(readCachedRootAuth(getCurrentAuthCookieSignature())).toBeNull();
  });

  test("invalidates cached auth when the session cookie signature changes", () => {
    setWindow({} as Window);
    setDocument("skills-re.session_token=abc");

    writeCachedRootAuth(getCurrentAuthCookieSignature(), {
      currentUser: { id: "user-1" },
      isAdmin: false,
    });

    setDocument("skills-re.session_token=def");

    expect(
      readCachedRootAuth<{ currentUser: { id: string } | null; isAdmin: boolean }>(
        getCurrentAuthCookieSignature(),
      ),
    ).toBeNull();
  });
});
