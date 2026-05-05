---
title: Best Practices
description: Guidelines for writing skills that are effective, safe, and portable.
category: Reference
order: 5
updatedAt: 2025-01-01
---

## Keep Skills Focused

A skill should do one thing well. Resist the urge to bundle multiple behaviours into a single file — users can compose skills by installing several. A focused skill is easier to understand, test, and maintain.

**Good:** `code-review.md` — reviews diffs for correctness and style  
**Avoid:** `dev-assistant.md` — reviews code, writes tests, updates docs, and manages issues

## Write for the Weakest Compatible Agent

If your skill targets `claude-code, claude-api`, test it against both. Instructions that rely on Claude-specific capabilities will silently degrade on other runtimes. Use the `compatibility` frontmatter field to accurately communicate requirements.

## Be Precise About Allowed Tools

Only list tools the skill genuinely needs in `allowed-tools`. Requesting unnecessary permissions erodes user trust and may cause agent runtimes to reject the skill in restricted environments.

```yaml
# Avoid
allowed-tools: Bash Read Write Edit WebFetch WebSearch

# Prefer — only what's needed
allowed-tools: Read Bash
```

## Use Semantic Versioning

Follow [Semantic Versioning](https://semver.org) strictly:

- **Patch** (1.0.x) — wording tweaks, typo fixes that don't change behaviour
- **Minor** (1.x.0) — new optional behaviours, expanded compatibility
- **Major** (x.0.0) — breaking changes to expected outputs or required tools

## Keep the Skill Body Concise

Agent context windows are finite and expensive. Every sentence should add value. Avoid filler phrases like "You are a helpful assistant that…" — get straight to the instruction.

## Test Before Publishing

Run your skill against representative inputs locally before submitting:

```bash
claude --skill ./SKILL.md "Review the diff in HEAD"
```

Check that the output matches your intent and that the agent doesn't attempt any tools not listed in `allowed-tools`.

## License Your Work

Always set a `license` field. `MIT` is the most permissive and most common in the registry. If your skill is proprietary, use `Proprietary` and note any usage restrictions in the body.
