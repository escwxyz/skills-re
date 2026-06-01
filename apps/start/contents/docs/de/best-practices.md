---
title: Best Practices
description: Richtlinien für das Schreiben effektiver, sicherer und portabler Skills.
category: Referenz
order: 4
updatedAt: 2026-05-19
---

## Skills fokussiert halten

Ein Skill sollte eine Sache gut können. Widerstehe dem Drang, mehrere Verhaltensweisen in eine Datei zu bündeln — Nutzer können Skills durch die Installation mehrerer kombinieren. Ein fokussierter Skill ist leichter zu verstehen, zu testen und zu pflegen.

**Gut:** `code-review` — überprüft Diffs auf Korrektheit und Stil  
**Vermeiden:** `dev-assistant` — überprüft Code, schreibt Tests, aktualisiert Docs und verwaltet Issues

## Den Skill-Body prägnant halten

Agenten-Kontextfenster sind begrenzt und teuer. Jeder Satz sollte einen Mehrwert bieten. Vermeide Füllphrasen wie „Du bist ein hilfreicher Assistent, der…" — komm direkt zur Anweisung.

## Vor dem Einreichen testen

Installiere deinen Skill lokal und lese ihn über die CLI zurück, um den Inhalt zu prüfen:

```bash
skills-re install ./pfad/zum/skill --agent claude
skills-re read mein-skill --agent claude
```

Führe deinen Agenten dann gegen repräsentative Eingaben aus und prüfe, ob die Ausgabe deiner Absicht entspricht.

## Deine Arbeit lizenzieren

Setze immer ein `license`-Feld im Frontmatter. `MIT` ist die freizügigste und im Registry am häufigsten verwendete Lizenz.

```yaml
---
name: mein-skill
description: Eine einzeilige Zusammenfassung.
license: MIT
---
```

## Ein Repository, mehrere Skills

Wenn du eine Reihe verwandter Skills pflegst, organisiere sie als Unterverzeichnisse in einem einzigen Repository. Jedes Unterverzeichnis mit einer eigenen `SKILL.md` wird beim Einreichen unabhängig erkannt.

## Eine klare Beschreibung schreiben

Das `description`-Feld ist das, was Nutzer in den Suchergebnissen sehen. Ein präziser Satz schlägt einen vagen Absatz — beschreibe das Ergebnis, nicht den Mechanismus.

**Gut:** `Überprüft Git-Diffs auf Korrektheit, Stil und potenzielle Regressionen.`  
**Vermeiden:** `Ein hilfreicher Skill, der bei Code-Review-Aufgaben und verwandten Aktivitäten unterstützt.`
