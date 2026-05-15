/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  getRatingDataState,
  getRatingFocusIntent,
  getRatingHalfStepValue,
  getRatingItemSizeClassName,
  getRatingPartialFillGradientStops,
  getRatingSelectedItemValue,
} from "./rating-utils";

describe("rating utils", () => {
  test("maps arrow keys for rtl horizontal navigation", () => {
    expect(getRatingFocusIntent("ArrowLeft", "rtl", "horizontal")).toBe("next");
    expect(getRatingFocusIntent("ArrowRight", "rtl", "horizontal")).toBe("prev");
  });

  test("ignores vertical keys for horizontal navigation", () => {
    expect(getRatingFocusIntent("ArrowUp", "ltr", "horizontal")).toBeUndefined();
    expect(getRatingFocusIntent("ArrowDown", "ltr", "vertical")).toBe("next");
  });

  test("resolves half-step values for click and hover targets", () => {
    expect(getRatingHalfStepValue(4, 0.5, "ltr", true)).toBe(3.5);
    expect(getRatingHalfStepValue(4, 0.5, "ltr", false)).toBe(4);
    expect(getRatingHalfStepValue(4, 0.5, "rtl", true)).toBe(4);
    expect(getRatingHalfStepValue(4, 0.5, "rtl", false)).toBe(3.5);
  });

  test("chooses the selected item for focus in half-step mode", () => {
    expect(getRatingSelectedItemValue(3.5, 0.5)).toBe(4);
    expect(getRatingSelectedItemValue(3, 1)).toBe(3);
  });

  test("derives display state and size class name", () => {
    expect(getRatingDataState(4, 3, 0.5)).toBe("full");
    expect(getRatingDataState(3.5, 4, 0.5)).toBe("partial");
    expect(getRatingDataState(1, 4, 1)).toBe("empty");

    expect(getRatingItemSizeClassName("sm")).toBe("size-4");
    expect(getRatingItemSizeClassName("default")).toBe("size-5");
    expect(getRatingItemSizeClassName("lg")).toBe("size-6");
  });

  test("orders partial-fill gradient stops by reading direction", () => {
    expect(getRatingPartialFillGradientStops("ltr")).toEqual([
      { offset: "50%", stopColor: "currentColor" },
      { offset: "50%", stopColor: "transparent" },
    ]);
    expect(getRatingPartialFillGradientStops("rtl")).toEqual([
      { offset: "50%", stopColor: "transparent" },
      { offset: "50%", stopColor: "currentColor" },
    ]);
  });
});
