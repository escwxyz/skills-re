/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SemanticSearchResults } from "./semantic-search-results";

describe("SemanticSearchResults", () => {
  test("shows keyword labels without semantic AI metadata", () => {
    const markup = renderToStaticMarkup(
      <SemanticSearchResults isLoading={false} items={[]} mode="keyword" query="workflow" />,
    );

    expect(markup).toContain("Keyword results for");
    expect(markup).toContain("workflow");
    expect(markup).toContain("No keyword matches");
    expect(markup).toContain("Metadata");
    expect(markup).not.toContain("Semantic index");
    expect(markup).not.toContain("Match score");
  });

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

  test("shows a non-blocking metadata fallback state", () => {
    const markup = renderToStaticMarkup(
      <SemanticSearchResults
        degraded
        isLoading={false}
        items={[]}
        mode="keyword"
        query="workflow"
      />,
    );

    expect(markup).toContain("Full-text unavailable · metadata fallback");
    expect(markup).toContain("No keyword matches");
  });
});
