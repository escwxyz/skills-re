---
question: Wie installiere und verwalte ich Skills mit der CLI?
order: 4
---

Installiere die CLI global:

```bash
npm install -g @skills-re/cli
```

**Durchsuche und installiere** einen Skill aus dem Registry nach Slug und gib deinen Agenten mit `--agent` an:

```bash
skills-re search code review

skills-re install code-review --agent claude    # → .claude/skills/code-review/
skills-re install code-review --agent cursor    # → .cursor/skills/code-review/
skills-re install code-review --agent codex     # → .codex/skills/code-review/
```

Sperre eine bestimmte Version mit `@version`:

```bash
skills-re install code-review@2.4.1 --agent claude
```

Installiere direkt von einem GitHub-Repository ohne Registry:

```bash
skills-re install owner/repo --git --agent claude
```

**Aktiviere** installierte Skills, indem du sie in die Metadatendatei deines Agenten synchronisierst:

```bash
skills-re sync --agent claude
skills-re sync --agent cursor
```

Führe `sync` nach der Installation oder Aktualisierung von Skills erneut aus.

**Aktualisiere und liste** installierte Skills:

```bash
skills-re update --agent claude
skills-re update code-review --agent claude
skills-re list
```

Siehe den [Getting Started guide](/docs/getting-started) für das vollständige CLI-Referenz, einschließlich MCP-Server-Modus.
