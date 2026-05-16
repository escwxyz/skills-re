/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SemanticSearchResults } from "./semantic-search-results";

describe("SemanticSearchResults", () => {
  test("shows a dedicated rate limit message when search is blocked", () => {
    const markup = renderToStaticMarkup(
      <SemanticSearchResults
        error={new Error("Search rate limit exceeded. Please try again in 42 seconds.")}
        isLoading={false}
        items={[]}
        query="workflow"
      />,
    );

    expect(markup).toContain("Search temporarily limited");
    expect(markup).toContain("42 seconds");
  });
});
