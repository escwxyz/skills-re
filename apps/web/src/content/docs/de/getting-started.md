---
title: Erste Schritte
description: Installiere dein erstes Skill und leg in wenigen Minuten los.
category: Einführung
order: 1
updatedAt: 2025-01-01
---

## Voraussetzungen

Stelle sicher, dass eine unterstützte KI-Agenten-Laufzeitumgebung installiert ist:

- **Claude Code** — Anthropics CLI-Agent (Befehl `claude`)
- **Codex** — OpenAIs Agenten-Laufzeit
- **Cursor** / **GitHub Copilot** — IDE-integrierte Agenten

## Ein Skill installieren

Skills sind einfache Markdown-Dateien. Lade die `SKILL.md`-Datei herunter und platziere sie in deinem Projekt:

```bash
curl -sL https://skills.re/s/code-review/SKILL.md -o .claude/skills/code-review.md
```

Oder nutze das `skill.sh`-Installationsskript:

```bash
curl -sL https://skill.sh | sh -s -- code-review
```

## Nächste Schritte

- Lies [Skills veröffentlichen](/docs/publishing-skills)
- Entdecke Skills im [Registry](/skills)
- Lies die [Best Practices](/docs/best-practices)
