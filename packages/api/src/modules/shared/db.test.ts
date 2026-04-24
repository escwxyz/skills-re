/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

/**
 * Tests for the shared db module's unavailable-database proxy behavior.
 *
 * The db module exports a top-level-await `db` that either:
 * 1. Returns a real database from @skills-re/db/runtime if the binding is available.
 * 2. Returns a Proxy that throws on any property access (except "then") when the
 *    runtime is unavailable (e.g., outside of a Cloudflare Workers environment).
 *
 * We replicate the proxy factory here to test its contract independently of the
 * module-level import, which may succeed or fail depending on the environment.
 */

type Database = Record<string | symbol, unknown>;

const createUnavailableDb = (cause: unknown): Database =>
  new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "then") {
          return null;
        }
        throw new Error("Default database binding is unavailable outside Cloudflare Workers.", {
          cause,
        });
      },
    },
  ) as Database;

describe("createUnavailableDb proxy", () => {
  test("returns null for the 'then' property to prevent promise-like behavior", () => {
    const db = createUnavailableDb(new Error("runtime unavailable"));
    expect(db["then"]).toBeNull();
  });

  test("throws an informative error when accessing a database method", () => {
    const db = createUnavailableDb(new Error("runtime unavailable"));
    expect(() => db["select"]).toThrow(
      "Default database binding is unavailable outside Cloudflare Workers.",
    );
  });

  test("throws an informative error for insert, update, and delete operations", () => {
    const db = createUnavailableDb(new Error("no binding"));
    for (const method of ["insert", "update", "delete"]) {
      expect(() => db[method]).toThrow(
        "Default database binding is unavailable outside Cloudflare Workers.",
      );
    }
  });

  test("includes the original cause in the thrown error", () => {
    const cause = new Error("original import error");
    const db = createUnavailableDb(cause);
    let thrownError: unknown;
    try {
      // biome-ignore lint: accessing proxy to trigger error
      void db["query"];
    } catch (error) {
      thrownError = error;
    }
    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error & { cause: unknown }).cause).toBe(cause);
  });

  test("does not throw for the 'then' property check (non-promise object)", () => {
    const db = createUnavailableDb(null);
    expect(() => db["then"]).not.toThrow();
    // Verify it cannot be awaited accidentally (value is null, not a function)
    expect(db["then"]).toBeNull();
  });

  test("throws for arbitrary symbol property access", () => {
    const db = createUnavailableDb(undefined);
    const sym = Symbol("myProp");
    expect(() => db[sym]).toThrow(
      "Default database binding is unavailable outside Cloudflare Workers.",
    );
  });
});

describe("db module export", () => {
  test("exports a db object (either real or proxy)", async () => {
    // The module uses top-level await; we just verify the export is defined.
    // In test environments @skills-re/db/runtime may fail, resulting in a proxy,
    // or may succeed, resulting in a real db instance. Either way, db must be
    // a non-null object.
    const { db } = await import("./db");
    expect(db).toBeDefined();
    expect(typeof db).toBe("object");
  });

  test("db 'then' property is null when runtime is unavailable (proxy mode)", async () => {
    // When @skills-re/db/runtime is not available in the test environment,
    // the exported db is the unavailable proxy, which returns null for 'then'.
    // When the runtime IS available, db is a real drizzle instance (no 'then').
    const { db } = await import("./db");
    // Both cases: 'then' should be null or undefined (not a function),
    // confirming db is not accidentally a Promise.
    const thenProp = (db as unknown as Record<string, unknown>)["then"];
    expect(typeof thenProp === "function").toBe(false);
  });
});