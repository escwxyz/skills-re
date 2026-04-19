/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { newsletterTable } from "./newsletter";

const getExtraConfigNames = (table: object) => {
  const builderKey = Object.getOwnPropertySymbols(table).find((symbol) =>
    String(symbol).includes("ExtraConfigBuilder"),
  );
  if (!builderKey) {
    return [];
  }

  return ((table as Record<symbol, unknown>)[builderKey] as (table: object) => unknown[])(table)
    .map((item) => {
      const typedItem = item as { config?: { name?: string }; name?: string };
      return typedItem.name ?? typedItem.config?.name;
    })
    .filter((name): name is string => typeof name === "string");
};

describe("newsletter schema", () => {
  test("exposes the expected core columns", () => {
    expect(newsletterTable.email.name).toBe("email");
    expect(newsletterTable.device.name).toBe("device");
    expect(newsletterTable.createdAt.name).toBe("created_at");
  });

  test("retains the created-at index", () => {
    expect(getExtraConfigNames(newsletterTable)).toEqual(["newsletter_created_at_idx"]);
  });
});
