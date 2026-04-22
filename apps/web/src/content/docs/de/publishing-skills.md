---
title: Skills veröffentlichen
description: Teile deine Skills mit der Community, indem du sie im Registry veröffentlichst.
category: Anleitungen
order: 2
updatedAt: 2025-01-01
---

## Übersicht

Das Veröffentlichen eines Skills macht es im Registry auffindbar und von jedem mit einem kompatiblen Agenten installierbar. Skills sind versioniert, signiert und nach der Veröffentlichung unveränderlich.

## Eine SKILL.md erstellen

Jedes Skill beginnt mit einer `SKILL.md`-Datei. Die erforderlichen Frontmatter-Felder sind:

```yaml
---
name: mein-skill
description: Eine einzeilige Zusammenfassung.
license: MIT
compatibility: claude-code, claude-api
metadata:
  version: 1.0.0
  stage: stable
allowed-tools: Bash Read
---
```

## Beim Registry einreichen

1. Fork oder erstelle ein GitHub-Repository mit deiner `SKILL.md`
2. Gehe zu [Einreichen](/submit) und verbinde deinen GitHub-Account
3. Wähle das Repository und den Branch oder Tag aus
4. Überprüfe die automatisierten Prüfungen
5. Veröffentliche — dein Skill ist innerhalb von Minuten live
