---
title: Best Practices
description: Guidelines for writing skills that are effective, safe, and portable.
category: Reference
order: 4
updatedAt: 2026-05-19
---

## Keep Skills Focused

A skill should do one thing well. Resist the urge to bundle multiple behaviours into a single file — users can compose skills by installing several. A focused skill is easier to understand, test, and maintain.

**Good:** `code-review` — reviews diffs for correctness and style  
**Avoid:** `dev-assistant` — reviews code, writes tests, updates docs, and manages issues

## Keep the Skill Body Concise

Agent context windows are finite and expensive. Every sentence should add value. Avoid filler phrases like "You are a helpful assistant that…" — get straight to the instruction.

## Test Before Submitting

Install your skill locally and read it back through the CLI to verify the content looks correct:

```bash
skills-re install ./path/to/skill --agent claude
skills-re read my-skill --agent claude
```

Then run your agent against representative inputs and check that the output matches your intent.

## License Your Work

Always set a `license` field in the frontmatter. `MIT` is the most permissive and most common in the registry.

```yaml
---
name: my-skill
description: A one-line summary.
license: MIT
---
```

## One Repository, Multiple Skills

If you maintain a suite of related skills, organise them as subdirectories in a single repository. Each subdirectory with its own `SKILL.md` is detected independently at submit time.

## Write a Clear Description

The `description` field is what users see in search results. One precise sentence beats a vague paragraph — describe the outcome, not the mechanism.

**Good:** `Reviews git diffs for correctness, style, and potential regressions.`  
**Avoid:** `A helpful skill that assists with code review tasks and related activities.`
