---
title: GitHub Integration
description: Connect your GitHub account to publish and sync skills automatically.
category: Guides
order: 3
updatedAt: 2025-01-01
---

## Connecting GitHub

To publish skills from a GitHub repository, authorize the skills.re GitHub App:

1. Go to **Settings → Integrations → GitHub**
2. Click **Connect GitHub**
3. Authorize the `skills-re` GitHub App for the repositories you want to publish from

The app only requests read access to repository contents and metadata — it never writes to your repositories.

## Auto-Publishing via GitHub Actions

Add the official workflow to your repository to publish automatically on every tagged release:

```yaml
# .github/workflows/publish-skill.yml
name: Publish Skill

on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: skills-re/publish-action@v1
        with:
          token: ${{ secrets.SKILLS_RE_TOKEN }}
```

Generate a `SKILLS_RE_TOKEN` from **Settings → API Tokens** and add it to your repository secrets.

## Signed Releases

For signed skills, add your GPG key ID to the workflow:

```yaml
- uses: skills-re/publish-action@v1
  with:
    token: ${{ secrets.SKILLS_RE_TOKEN }}
    gpg-key: ${{ secrets.GPG_PRIVATE_KEY }}
    gpg-fingerprint: ABCD1234
```

## Webhooks

The registry sends webhook events to your configured endpoint on publish, deprecation, and version updates. Configure webhooks in **Settings → Webhooks**.

## Troubleshooting

If your workflow fails, check:

- The `SKILLS_RE_TOKEN` secret is set and not expired
- The `SKILL.md` frontmatter passes validation (run `skill validate` locally)
- Your repository is authorized in the GitHub App installation
