---
title: Publishing Skills
description: Share your skills with the community by publishing to the registry.
category: Guides
order: 2
updatedAt: 2025-01-01
---

## Overview

Publishing a skill makes it discoverable in the registry and installable by anyone with a compatible agent. Skills are versioned, signed, and immutable once released.

## Creating a SKILL.md

Every skill starts with a `SKILL.md` file. The required frontmatter fields are:

```yaml
---
name: my-skill
description: A one-line summary of what this skill does.
license: MIT
compatibility: claude-code, claude-api
metadata:
  version: 1.0.0
  stage: stable
allowed-tools: Bash Read
---
```

Below the frontmatter, write the skill body in plain markdown. This is the text your agent will receive as a system-level instruction. Be concise and precise — every token counts.

## Submitting to the Registry

1. **Fork or create a GitHub repository** containing your `SKILL.md`
2. **Go to [Submit](/submit)** and connect your GitHub account
3. **Select the repository** and the branch or tag to publish
4. **Review the automated checks** — the registry validates frontmatter, runs a basic eval, and checks the license
5. **Publish** — your skill is live within minutes

## Versioning

Use [Semantic Versioning](https://semver.org). Each published version is immutable. To release an update, increment the `metadata.version` field and re-submit.

```yaml
metadata:
  version: 1.1.0 # bumped from 1.0.0
  stage: stable
```

## Signing

Skills can optionally be signed with a GPG key to prove authorship. See [GitHub Integration](/docs/github-integration) for details.

## Unpublishing

Skills cannot be deleted once published, but they can be deprecated. Deprecated skills remain installable but are excluded from browse and search results.
