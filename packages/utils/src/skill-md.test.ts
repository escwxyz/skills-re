/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { parseSkillMarkdownDocument, slugifyHeadingBase } from "./skill-md";

describe("skill markdown parsing", () => {
  test("builds slug-based toc items from heading text", () => {
    expect(slugifyHeadingBase("Getting Started")).toBe("getting-started");
    expect(slugifyHeadingBase("What's New?")).toBe("whats-new");
  });

  test("preserves duplicate heading order with unique slugs", () => {
    const parsed = parseSkillMarkdownDocument(`---
name: Example
description: Example
---

# Title

## Getting Started

### Getting Started

## What's New?
`);

    expect(parsed.tocItems).toEqual([
      { slug: "getting-started", title: "Getting Started" },
      { slug: "getting-started-2", title: "Getting Started" },
      { slug: "whats-new", title: "What's New?" },
    ]);
  });
});
