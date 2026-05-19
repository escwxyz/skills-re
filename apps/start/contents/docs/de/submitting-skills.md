---
title: Skills einreichen
description: Teile deine Skills mit der Community, indem du ein GitHub-Repository im Registry einreichst.
category: Anleitungen
order: 2
updatedAt: 2026-05-19
---

## Übersicht

Das Einreichen eines Skills macht es im Registry auffindbar und für jeden mit `skills-re` installierbar. Jeder kann einreichen — kein Konto erforderlich. Skills sind versioniert und nach der Einreichung unveränderlich — jede eingereichte Version ist ein dauerhafter Snapshot.

## Schritt 1 — SKILL.md erstellen

Jedes Skill beginnt mit einer `SKILL.md`-Datei in einem öffentlichen GitHub-Repository. Die erforderlichen Frontmatter-Felder sind:

```yaml
---
name: mein-skill
description: Eine einzeilige Zusammenfassung.
license: MIT
---
```

Schreibe den Skill-Body unterhalb des Frontmatters in einfachem Markdown. Dies ist der Text, den dein Agent als systemseitige Anweisung erhält — sei präzise und knapp.

Mehrere Skills können in einem Repository untergebracht werden, jedes in einem eigenen Unterverzeichnis mit einer eigenen `SKILL.md`.

## Schritt 2 — Über die Website einreichen

Gehe zu [/submit](/submit) und füge deine GitHub-Repository-URL in das Formular ein. Das Registry ruft das Repository ab, erkennt alle `SKILL.md`-Dateien und zeigt eine Vorschau mit eventuellen Validierungsfehlern.

Wähle die Skills aus, die du einreichen möchtest, und klicke auf **Submit**. Deine Skills sind innerhalb weniger Minuten live.

## Versionierung

Jede Einreichung erstellt einen neuen unveränderlichen Snapshot, der den aktuellen Zustand deines Repositories widerspiegelt. Um ein Update einzureichen, aktualisiere den Inhalt der `SKILL.md` in deinem Repository und reiche erneut ein — das Registry erkennt die Änderung und erstellt eine neue Version.

## Einreichung zurückziehen

Skills können nach der Einreichung nicht gelöscht werden. Sie können als veraltet markiert werden, was sie aus Browse- und Suchergebnissen entfernt, während bestehende Installationen weiterhin funktionieren.
