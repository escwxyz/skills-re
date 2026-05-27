/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { clearCachedRootAuth, readCachedRootAuth, writeCachedRootAuth } from "./root-auth-cache";

const setWindow = (value: Window | undefined) => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value,
    writable: true,
  });
};

describe("root auth cache", () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
    clearCachedRootAuth();
  });

  afterEach(() => {
    clearCachedRootAuth();
    setWindow(originalWindow);
  });

  test("stores and reads auth state on the client", () => {
    setWindow({} as Window);

    writeCachedRootAuth({
      currentUser: { id: "user-1" },
      isAdmin: false,
    });

    expect(readCachedRootAuth<{ currentUser: { id: string } | null; isAdmin: boolean }>()).toEqual({
      currentUser: { id: "user-1" },
      isAdmin: false,
    });
  });

  test("clears auth state explicitly", () => {
    setWindow({} as Window);

    writeCachedRootAuth({
      currentUser: { id: "user-1" },
      isAdmin: true,
    });
    clearCachedRootAuth();

    expect(readCachedRootAuth()).toBeNull();
  });

  test("does not cache on the server", () => {
    setWindow(undefined);

    writeCachedRootAuth({
      currentUser: { id: "user-1" },
      isAdmin: true,
    });

    expect(readCachedRootAuth()).toBeNull();
  });
});
