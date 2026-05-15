/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Rating, RatingItem } from "./rating";
import { getRatingDisplayValue, getRatingItemState } from "./rating-utils";

describe("rating", () => {
  test("renders five empty stars by default", () => {
    const markup = renderToStaticMarkup(
      <Rating>
        {Array.from({ length: 5 }, (_, index) => (
          <RatingItem key={index} />
        ))}
      </Rating>,
    );

    expect(markup.match(/data-state="empty"/g) ?? []).toHaveLength(5);
  });

  test("fills stars while hovering a later item", () => {
    const displayValue = getRatingDisplayValue(0, 3);
    const states = Array.from({ length: 5 }, (_, index) =>
      getRatingItemState(displayValue, index + 1),
    );

    expect(states).toEqual(["filled", "filled", "filled", "empty", "empty"]);
  });
});
