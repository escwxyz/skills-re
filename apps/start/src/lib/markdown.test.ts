/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { parseSkillMarkdownDocument } from "@skills-re/utils";

import { renderMarkdownAsync, sanitizeRenderedHtml } from "./markdown";

describe("markdown sanitization", () => {
  test("removes unsafe tags and attributes from rendered html", () => {
    expect(
      sanitizeRenderedHtml(
        '<p onclick="alert(1)">Safe</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><iframe src="https://evil.test"></iframe>',
      ),
    ).toBe('<p>Safe</p><a href="#">x</a>');
  });

  test("removes srcdoc and inline event handlers from code-like output", () => {
    expect(
      sanitizeRenderedHtml(
        '<pre class="shiki" onmouseover="alert(1)"><code><span srcdoc="<script>alert(1)</script>">x</span></code></pre>',
      ),
    ).toBe('<pre class="shiki"><code><span>x</span></code></pre>');
  });
});

describe("markdown headings", () => {
  test("uses slugified heading text for toc anchors and heading ids", async () => {
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

    const html = await renderMarkdownAsync(parsed.body);
    expect(html).toContain('<h2 id="getting-started" tabindex="-1">Getting Started</h2>');
    expect(html).toContain('<h3 id="getting-started-2" tabindex="-1">Getting Started</h3>');
    expect(html).toContain('<h2 id="whats-new" tabindex="-1">What’s New?</h2>');
  });
});
