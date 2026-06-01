/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SkillsSearchField } from "./skills-search-field";

const noop = () => null;

describe("SkillsSearchField", () => {
  test("renders a keyword and semantic mode switch with the selected mode pressed", () => {
    const markup = renderToStaticMarkup(
      <SkillsSearchField
        active
        onChange={noop}
        onClear={noop}
        onFocus={noop}
        onSearchModeChange={noop}
        onSubmit={noop}
        searchMode="keyword"
        value="workflow"
      />,
    );

    expect(markup).toContain("Keyword");
    expect(markup).toContain("Semantic");
    expect(markup).toContain('aria-pressed="true"');
  });
});
