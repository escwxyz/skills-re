---
title: Getting Started
description: Install your first skill and get up and running in minutes.
category: Introduction
order: 1
updatedAt: 2025-01-01
---

## Prerequisites

Before you begin, make sure you have a supported AI agent runtime installed:

- **Claude Code** — Anthropic's CLI agent (`claude` command)
- **Codex** — OpenAI's agent runtime
- **Cursor** / **GitHub Copilot** — IDE-integrated agents

## Installing a Skill

Skills are plain markdown files. To install one, download the `SKILL.md` file and place it in your project:

```bash
curl -sL https://skills.re/s/code-review/SKILL.md -o .claude/skills/code-review.md
```

Or use the `skill.sh` installer script for one-liner installs:

```bash
curl -sL https://skill.sh | sh -s -- code-review
```

## Using a Skill

Once installed, reference the skill in your agent's context. For Claude Code:

```bash
claude --skill code-review "Review my changes"
```

Most agents pick up skills automatically when the `SKILL.md` is present in the project root or a recognized skills directory.

## Your First Skill

Try the `code-review` skill — it reviews git diffs and provides structured feedback:

1. Install: `skill.sh install code-review`
2. Stage some changes: `git add -p`
3. Run: `claude "Review my staged changes"`

The skill instructs the agent to check for correctness, style, and potential bugs without needing any extra prompt engineering on your part.

## Next Steps

- Read [Publishing Skills](/docs/publishing-skills) to share your own skills
- Browse the [registry](/skills) to discover community skills
- Check [Best Practices](/docs/best-practices) for writing effective skills
