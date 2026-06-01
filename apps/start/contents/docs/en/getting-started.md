---
title: Getting Started
description: Install your first skill and get up and running in minutes.
category: Introduction
order: 1
updatedAt: 2026-05-19
---

## Install the CLI

```bash
npm install -g @skills-re/cli
```

## Authenticate

Log in with your skills.re account using the device flow:

```bash
skills-re auth login
```

Check your login status, or log out:

```bash
skills-re auth status
skills-re auth logout
```

Authentication is optional for installing public skills.

## Find a Skill

Search the registry by keyword, tag, or category:

```bash
skills-re search code review
skills-re search --tag testing
skills-re search --category security --limit 5
```

Each result shows the skill title, description, and full path (`author/repo/slug`). The **full path** is what you pass to `install`.

Inspect a specific skill's details before installing:

```bash
# by full registry path
skills-re show anthropic-labs/my-repo/code-review
```

## Install a Skill

Pass the full skill path (`author/repo/skill`) to `install`, and target your agent with `--agent`:

```bash
# Claude Code  →  .claude/skills/code-review/
skills-re install anthropic-labs/my-repo/code-review --agent claude

# Codex        →  .codex/skills/code-review/  (default when --agent is omitted)
skills-re install anthropic-labs/my-repo/code-review --agent codex

# Cursor       →  .cursor/skills/code-review/
skills-re install anthropic-labs/my-repo/code-review --agent cursor

# Windsurf     →  .windsurf/skills/code-review/
skills-re install anthropic-labs/my-repo/code-review --agent windsurf

# Aider        →  .aider/skills/code-review/
skills-re install anthropic-labs/my-repo/code-review --agent aider
```

Pin to a specific version with `@version`:

```bash
skills-re install anthropic-labs/my-repo/code-review@2.4.1 --agent claude
```

Install directly from a GitHub repository:

```bash
# from a full GitHub URL
skills-re install https://github.com/owner/repo --agent claude

# from owner/repo shorthand
skills-re install owner/repo --git --agent claude
```

GitHub installs require `git` to be available in your `PATH`.

## Activate Skills in Your Agent

After installing, run `sync` to write a managed block into your agent's metadata file. The agent reads this block to discover available skills.

```bash
skills-re sync --agent claude    # writes to CLAUDE.md
skills-re sync --agent codex     # writes to AGENTS.md
skills-re sync --agent cursor    # writes to .cursor/rules/skills-re.mdc
skills-re sync --agent windsurf  # writes to AGENTS.md
skills-re sync --agent aider     # writes to AGENTS.md
```

Re-run `sync` whenever you install or update skills.

## Update Skills

```bash
# update all installed skills to their latest versions
skills-re update --agent claude

# update a single skill
skills-re update code-review --agent claude
```

## List Installed Skills

View everything recorded in the lockfile (`skills-lock.json`):

```bash
skills-re list
skills-re list --json
```

## Read an Installed Skill

Output the raw content of an installed skill (used by agents at runtime):

```bash
skills-re read code-review --agent claude
```

## MCP Server

Run the CLI as a local MCP server so agents can install and read skills directly:

```bash
skills-re mcp
```

Print the MCP configuration block (local + remote):

```bash
skills-re mcp --remote-config
```

## Next Steps

- Read [Publishing Skills](/docs/submitting-skills) to share your own skills
- Browse the [registry](/skills) to discover community skills
- Check [Best Practices](/docs/best-practices) for writing effective skills
