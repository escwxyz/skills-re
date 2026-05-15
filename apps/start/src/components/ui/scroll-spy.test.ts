/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { getScrollSpyActiveValue } from "./scroll-spy";

const target = (id: string, top: number) =>
  ({
    getBoundingClientRect: () => ({ top }),
    id,
  }) as const;

const container = (scrollTop: number, scrollHeight: number, clientHeight: number) =>
  ({
    clientHeight,
    scrollHeight,
    scrollTop,
  }) as const;

describe("getScrollSpyActiveValue", () => {
  test("selects the last heading above the offset", () => {
    expect(
      getScrollSpyActiveValue(
        [target("getting-started", -320), target("usage", -50), target("api", 180)],
        container(400, 2000, 600) as unknown as HTMLElement,
        132,
      ),
    ).toBe("usage");
  });

  test("keeps the final heading active near the bottom of the page", () => {
    expect(
      getScrollSpyActiveValue(
        [target("getting-started", -320), target("usage", -50), target("api", 180)],
        container(1390, 2000, 600) as unknown as HTMLElement,
        132,
      ),
    ).toBe("api");
  });
});
