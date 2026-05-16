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
      { depth: 2, slug: "getting-started", title: "Getting Started" },
      { depth: 3, slug: "getting-started-2", title: "Getting Started" },
      { depth: 2, slug: "whats-new", title: "What's New?" },
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

  test("parses folded block scalar description (>)", () => {
    const parsed = parseSkillMarkdownDocument(`---
name: caveman-commit
description: >
  Ultra-compressed commit message generator. Cuts noise from commit messages while preserving
  intent and reasoning. Conventional Commits format.
---

Body content.
`);

    expect(parsed.frontmatter).toMatchObject({
      description:
        "Ultra-compressed commit message generator. Cuts noise from commit messages while preserving intent and reasoning. Conventional Commits format.",
      name: "caveman-commit",
    });
    expect(parsed.body).toBe("Body content.");
  });

  test("parses literal block scalar description (|)", () => {
    const parsed = parseSkillMarkdownDocument(`---
name: example
description: |
  Line one.
  Line two.
---
`);

    expect(parsed.frontmatter?.description).toBe("Line one.\nLine two.");
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

    expect(parsed.tocItems).toEqual([
      { depth: 2, slug: "visible-heading", title: "Visible Heading" },
    ]);
  });
});
