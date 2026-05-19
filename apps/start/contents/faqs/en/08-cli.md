---
question: How do I install and manage skills with the CLI?
order: 4
---

Install the CLI globally:

```bash
npm install -g @skills-re/cli
```

**Search and install** a skill from the registry by slug, targeting your agent with `--agent`:

```bash
skills-re search code review

skills-re install code-review --agent claude    # → .claude/skills/code-review/
skills-re install code-review --agent cursor    # → .cursor/skills/code-review/
skills-re install code-review --agent codex     # → .codex/skills/code-review/
```

Pin a specific version with `@version`:

```bash
skills-re install code-review@2.4.1 --agent claude
```

Install directly from a GitHub repository without using the registry:

```bash
skills-re install owner/repo --git --agent claude
```

**Activate** installed skills by syncing them into your agent’s metadata file:

```bash
skills-re sync --agent claude     # writes to CLAUDE.md
skills-re sync --agent cursor     # writes to .cursor/rules/skills-re.mdc
```

Re-run `sync` after installing or updating skills.

**Update and list** installed skills:

```bash
skills-re update --agent claude
skills-re update code-review --agent claude
skills-re list
```

See the [Getting Started guide](/docs/getting-started) for the full CLI reference, including MCP server mode.
