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

  test("reads skill metadata from a leading markdown table", () => {
    const parsed = parseSkillMarkdownDocument(`| name | caveman |
| description | Ultra-compressed communication mode. Cuts token usage ~75%. |

Respond terse like smart caveman.
`);

    expect(parsed.frontmatter).toMatchObject({
      description: "Ultra-compressed communication mode. Cuts token usage ~75%.",
      name: "caveman",
    });
    expect(parsed.body).toBe("Respond terse like smart caveman.");
  });

  test("ignores headings inside fenced code blocks", () => {
    const parsed = parseSkillMarkdownDocument(`---
name: Example
description: Example
---

## Visible Heading

\`\`\`md
## Hidden Heading
\`\`\`

~~~txt
### Also Hidden
~~~
`);

    expect(parsed.tocItems).toEqual([{ slug: "visible-heading", title: "Visible Heading" }]);
  });
});
