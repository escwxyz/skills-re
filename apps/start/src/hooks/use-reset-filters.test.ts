/// <reference types="bun-types" />

import { expect, test } from "bun:test";

import { buildResetBrowseSearch } from "./use-reset-filters";

test("buildResetBrowseSearch clears browse filters and preserves other search state", () => {
  const search = {
    category: "tools",
    feature: "keep-me",
    page: 3,
    q: "react",
    sort: "stars",
    tag: ["ui"],
    tags: ["backend"],
  } as Record<string, unknown>;

  const result = buildResetBrowseSearch(search);

  expect(result).toEqual({
    category: undefined,
    feature: "keep-me",
    page: 3,
    q: undefined,
    sort: undefined,
    tag: undefined,
    tags: undefined,
  });
});
