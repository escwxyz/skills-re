---
title: Erste Schritte
description: Installiere dein erstes Skill und leg in wenigen Minuten los.
category: Einführung
order: 1
updatedAt: 2026-05-19
---

## CLI installieren

```bash
npm install -g @skills-re/cli
```

## Anmelden

Melde dich mit deinem skills.re-Konto über den Device-Flow an:

```bash
skills-re auth login
```

Status prüfen oder abmelden:

```bash
skills-re auth status
skills-re auth logout
```

Für das Installieren öffentlicher Skills ist keine Anmeldung erforderlich.

## Skill finden

Suche im Registry nach Stichwort, Tag oder Kategorie:

```bash
skills-re search code review
skills-re search --tag testing
skills-re search --category security --limit 5
```

Jedes Ergebnis zeigt Titel, Slug, Beschreibung und Quellpfad (`author/repo/slug`). Der **Slug** wird beim Installieren übergeben.

Details zu einem bestimmten Skill anzeigen:

```bash
# per Slug
skills-re show code-review

# per vollständigem Registrypfad aus den Suchergebnissen
skills-re show anthropic-labs/my-repo/code-review
```

## Skill installieren

Übergib den Slug des Skills an `install` und wähle deinen Agenten mit `--agent`:

```bash
# Claude Code  →  .claude/skills/code-review/
skills-re install code-review --agent claude

# Codex        →  .codex/skills/code-review/  (Standard ohne --agent)
skills-re install code-review --agent codex

# Cursor       →  .cursor/skills/code-review/
skills-re install code-review --agent cursor

# Windsurf     →  .windsurf/skills/code-review/
skills-re install code-review --agent windsurf

# Aider        →  .aider/skills/code-review/
skills-re install code-review --agent aider
```

Bestimmte Version mit `@version` festlegen:

```bash
skills-re install code-review@2.4.1 --agent claude
```

Direkt aus einem GitHub-Repository installieren:

```bash
# per vollständiger GitHub-URL
skills-re install https://github.com/owner/repo --agent claude

# per owner/repo-Kurzschreibweise
skills-re install owner/repo --git --agent claude
```

GitHub-Installs erfordern `git` im `PATH`.

## Skills im Agenten aktivieren

Nach der Installation führe `sync` aus, damit dein Agent die installierten Skills erkennt:

```bash
skills-re sync --agent claude    # schreibt nach CLAUDE.md
skills-re sync --agent codex     # schreibt nach AGENTS.md
skills-re sync --agent cursor    # schreibt nach .cursor/rules/skills-re.mdc
skills-re sync --agent windsurf  # schreibt nach AGENTS.md
skills-re sync --agent aider     # schreibt nach AGENTS.md
```

`sync` nach jeder Installation oder Aktualisierung erneut ausführen.

## Skills aktualisieren

```bash
# alle installierten Skills auf die neueste Version aktualisieren
skills-re update --agent claude

# ein einzelnes Skill aktualisieren
skills-re update code-review --agent claude
```

## Installierte Skills auflisten

Alles in der Lockfile (`skills-lock.json`) anzeigen:

```bash
skills-re list
skills-re list --json
```

## Skill-Inhalt lesen

Den Rohinhalt eines installierten Skills ausgeben:

```bash
skills-re read code-review --agent claude
```

## Nächste Schritte

- Lies [Skills veröffentlichen](/docs/submitting-skills)
- Entdecke Skills im [Registry](/skills)
- Lies die [Best Practices](/docs/best-practices)
