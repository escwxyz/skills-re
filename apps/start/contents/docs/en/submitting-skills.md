---
title: Submitting Skills
description: Share your skills with the community by submitting a GitHub repository to the registry.
category: Guides
order: 2
updatedAt: 2026-05-19
---

## Overview

Submitting a skill makes it discoverable in the registry and installable by anyone with `skills-re`. Anyone can submit — no account required. Skills are versioned and immutable once accepted — every submitted version is a permanent snapshot.

## Step 1 — Create a SKILL.md

Every skill starts with a `SKILL.md` file in a public GitHub repository. The required frontmatter fields are:

```yaml
---
name: my-skill
description: A one-line summary of what this skill does.
license: MIT
---
```

Below the frontmatter, write the skill body in plain markdown. This is what your agent receives as a system-level instruction — be concise and precise.

You can place multiple skills in one repository, each in its own subdirectory with its own `SKILL.md`.

## Step 2 — Submit via the Website

Go to [/submit](/submit) and paste your GitHub repository URL into the form. The registry fetches the repository, detects all `SKILL.md` files, and shows you a preview with any validation errors.

Select the skills you want to submit and click **Submit**. Your skills are live within minutes.

## Versioning

Each submission creates a new immutable snapshot tied to the current state of your repository. To release an update, update the `SKILL.md` content in your repository and submit again — the registry will detect the change and create a new version.

## Unpublishing

Skills cannot be deleted once submitted. They can be deprecated, which removes them from browse and search results while keeping existing installs working.
