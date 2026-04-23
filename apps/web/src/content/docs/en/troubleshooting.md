---
title: Troubleshooting
description: Solutions to common issues when installing and using skills.
category: Support
order: 6
updatedAt: 2025-01-01
---

## Skill Not Recognised by Agent

**Symptom:** The agent ignores the skill or behaves as if it isn't loaded.

**Check:**

1. The `SKILL.md` is in the correct directory for your runtime (e.g. `.claude/skills/` for Claude Code)
2. The `compatibility` field in the frontmatter includes your agent runtime
3. Your agent runtime is up to date — older versions may not support the `allowed-tools` field

## Frontmatter Validation Errors

**Symptom:** The registry rejects your submission with a validation error.

Common causes:

- `version` in `metadata` is not a valid semantic version string
- `allowed-tools` lists a tool name with a typo (tool names are case-sensitive)
- `updatedAt` is in an unrecognised date format — use `YYYY-MM-DD`

Run `skill validate ./SKILL.md` locally to catch errors before submitting.

## GitHub Action Fails to Publish

**Symptom:** The `publish-skill` workflow exits with a 401 or 403 error.

**Check:**

1. `SKILLS_RE_TOKEN` is set in repository secrets
2. The token has not expired — generate a new one in **Settings → API Tokens**
3. The GitHub App is still installed on the repository (check **Settings → Integrations → GitHub**)

## Skill Installed but Agent Uses Wrong Version

**Symptom:** The agent uses an outdated version of the skill.

Some runtimes cache skill content. Clear the cache:

```bash
# Claude Code
claude cache clear --skills

# skill.sh managed installs
skill update code-review
```

## Rate Limit Exceeded

**Symptom:** API requests return `429 Too Many Requests`.

Unauthenticated requests are limited to 60 per hour. Generate an API token and include it as a Bearer header to increase the limit to 5000 per hour.

## Still Stuck?

Open a support ticket via the **Help** menu, or join the community on Discord. Include the skill slug, your agent runtime version, and any error output when reporting issues.
