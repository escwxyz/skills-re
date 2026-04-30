import { describe, expect, it } from "bun:test";

import {
  getCategoryCopy,
  getCategoryDescription,
  getCategoryLabel,
  getCategoryTitle,
} from "./category-taxonomy";

describe("category-taxonomy", () => {
  it("reads category copy from the active locale messages", () => {
    const en = getCategoryCopy("en", "code-frameworks");
    const de = getCategoryCopy("de", "code-frameworks");

    expect(en.title).not.toEqual(de.title);
    expect(en.description).not.toEqual(de.description);
  });

  it("keeps helper calls locale-aware without changing callers", () => {
    expect(getCategoryTitle("code-frameworks", "en")).not.toEqual(
      getCategoryTitle("code-frameworks", "de"),
    );
    expect(getCategoryDescription("code-frameworks", "en")).not.toEqual(
      getCategoryDescription("code-frameworks", "de"),
    );
    expect(getCategoryLabel("code-frameworks", "en")).not.toEqual(
      getCategoryLabel("code-frameworks", "de"),
    );
  });
});
