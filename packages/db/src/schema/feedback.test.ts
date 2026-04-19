/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { feedbackTable } from "./feedback";

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

describe("feedback schema", () => {
  test("exposes the expected core columns", () => {
    expect(feedbackTable.id.name).toBe("id");
    expect(feedbackTable.status.name).toBe("status");
    expect(feedbackTable.type.name).toBe("type");
    expect(feedbackTable.userId.name).toBe("user_id");
  });

  test("retains the expected indexes", () => {
    expect(getExtraConfigNames(feedbackTable)).toEqual([
      "feedback_status_idx",
      "feedback_type_idx",
      "feedback_user_id_idx",
    ]);
  });
});
