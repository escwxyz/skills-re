---
question: Welches Format nutzen Skills?
order: 2
---

Ein Skill ist ein Ordner mit einer `SKILL.md`-Datei. Die Datei besteht aus zwei Teilen:

**Frontmatter** — YAML-Metadaten am Anfang der Datei:

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

**Body** — einfaches Markdown mit den Anweisungen, denen dein Agent folgen soll. Es gibt keine spezielle Syntax — schreibe es wie ein Agent-Systemprompt, mit Überschriften, Listen und klaren Schritt-für-Schritt-Anweisungen.

Die vollständige Formatreferenz findest du in der [Skill Specification](https://agentskills.io/specification). Zur Anleitung für effektives Skill-Design siehe den [Best Practices guide](https://agentskills.io/skill-creation/best-practices).
