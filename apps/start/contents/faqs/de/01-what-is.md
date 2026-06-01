---
question: Was sind Agent Skills?
order: 1
---

Agent Skills sind ein leichtgewichtiges offenes Format zur Erweiterung von KI-Agenten mit spezialisiertem Wissen, Workflows und Leitplanken. Ein Skill besteht aus einem Ordner mit einer `SKILL.md`-Datei, die Metadaten enthält (mindestens `name` und `description`) sowie die Anweisungen, denen ein Agent folgen soll. Skills können auch Skripte, Vorlagen, Beispiele oder andere unterstützende Dateien bündeln.

Im Gegensatz zu einer losen Prompt-Bibliothek folgen Skills einer definierten [Spezifikation](https://agentskills.io/specification) und sind portierbar. Jeder Agent, der eine Textdatei lesen und markdown-formatierte Anweisungen ausführen kann, kann sie nutzen.

Das **Agent Skill Registry** (skills.re) ist die zentrale Anlaufstelle zum Entdecken, Teilen und Verteilen von Skills. Skills im Registry werden versioniert und vor der Veröffentlichung gegen eine Standard-Evaluierungssuite getestet, damit ihr Verhalten beim Installieren verlässlicher ist.
