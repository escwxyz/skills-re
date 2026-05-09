/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { sanitizeRenderedHtml } from "./markdown";

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
