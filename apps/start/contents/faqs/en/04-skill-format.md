---
question: What format do skills use?
order: 2
---

A skill is a folder containing a `SKILL.md` file. The file has two parts:

**Frontmatter** — YAML metadata at the top of the file:

```yaml
---
name: my-skill
description: A one-line summary.
license: MIT
compatibility: claude-code, claude-api
version: 1.0.0
metadata:
  stage: stable
allowed-tools: Bash Read
---
```

**Body** — plain markdown containing the instructions your agent will follow. There is no special syntax — write it as you would any agent system prompt, using headings, lists, and clear step-by-step guidance.

The complete format reference is in the [Skill Specification](https://agentskills.io/specification). For guidance on writing effective skills, see the [Best Practices guide](https://agentskills.io/skill-creation/best-practices).
