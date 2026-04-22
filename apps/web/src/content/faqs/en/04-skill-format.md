---
question: What format do skills use?
order: 4
---

A skill is a single markdown file named `SKILL.md`. It has two parts:

**Frontmatter** — YAML metadata at the top of the file:

```yaml
---
name: my-skill
description: A one-line summary.
license: MIT
compatibility: claude-code, claude-api
metadata:
  version: 1.0.0
  stage: stable
allowed-tools: Bash Read
---
```

**Body** — plain markdown containing the instructions your agent will follow. There is no special syntax for the body — write it as you would any agent system prompt, using markdown headings and lists to structure the content.

The full specification is documented in the [SKILL.md Spec](/docs/api-reference).
