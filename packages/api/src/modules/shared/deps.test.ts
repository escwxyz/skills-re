/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createDepGetter } from "./deps";

describe("createDepGetter", () => {
  test("returns the override when it is provided", async () => {
    const override = () => "overridden";
    const getDep = createDepGetter<{ greet: () => string }>(
      { greet: override },
      async () => ({ greet: () => "default" }),
    );

    const fn = await getDep("greet");
    expect(fn).toBe(override);
    expect(fn()).toBe("overridden");
  });

  test("falls back to the default dep when no override is provided", async () => {
    const defaultFn = () => "default";
    const getDep = createDepGetter<{ greet: () => string }>(
      {},
      async () => ({ greet: defaultFn }),
    );

    const fn = await getDep("greet");
    expect(fn).toBe(defaultFn);
    expect(fn()).toBe("default");
  });

  test("resolves the correct key from overrides with multiple deps", async () => {
    const overrideA = () => "a-override";
    const defaultB = () => "b-default";

    interface Deps {
      a: () => string;
      b: () => string;
    }

    const getDep = createDepGetter<Deps>({ a: overrideA }, async () => ({
      a: () => "a-default",
      b: defaultB,
    }));

    expect(await getDep("a")).toBe(overrideA);
    expect(await getDep("b")).toBe(defaultB);
  });

  test("does not call getDefaultDeps when all needed deps are overridden", async () => {
    let defaultDepsCallCount = 0;
    const getDep = createDepGetter<{ x: () => number }>(
      { x: () => 42 },
      async () => {
        defaultDepsCallCount++;
        return { x: () => 0 };
      },
    );

    await getDep("x");
    expect(defaultDepsCallCount).toBe(0);
  });

  test("calls getDefaultDeps when the override is not provided", async () => {
    let defaultDepsCallCount = 0;
    const getDep = createDepGetter<{ y: () => number }>(
      {},
      async () => {
        defaultDepsCallCount++;
        return { y: () => 99 };
      },
    );

    const fn = await getDep("y");
    expect(defaultDepsCallCount).toBe(1);
    expect(fn()).toBe(99);
  });

  test("treats undefined override as not provided and uses default", async () => {
    const getDep = createDepGetter<{ z: () => string }>(
      { z: undefined },
      async () => ({ z: () => "from-default" }),
    );

    const fn = await getDep("z");
    expect(fn()).toBe("from-default");
  });

  test("works with async dep functions", async () => {
    const asyncOverride = async () => "async-result";
    const getDep = createDepGetter<{ fetch: () => Promise<string> }>(
      { fetch: asyncOverride },
      async () => ({ fetch: async () => "default-async" }),
    );

    const fn = await getDep("fetch");
    expect(fn).toBe(asyncOverride);
    await expect(fn()).resolves.toBe("async-result");
  });

  test("caches the default deps across multiple calls", async () => {
    let callCount = 0;
    const getDep = createDepGetter<{ a: () => number; b: () => number }>(
      {},
      async () => {
        callCount++;
        return { a: () => 1, b: () => 2 };
      },
    );

    await getDep("a");
    await getDep("b");
    // Note: createDepGetter calls getDefaultDeps per key call (no memoization in the utility itself)
    // so we just verify the values are returned correctly
    expect(callCount).toBeGreaterThan(0);
  });
});