---
title: API Reference
description: REST API for querying and installing skills programmatically.
category: Reference
order: 5
updatedAt: 2026-05-19
---

## Base URL

```
https://api.skills.re
```

## Interactive Docs

The full OpenAPI specification is available at:

```
https://api.skills.re/docs
```

All request and response schemas are defined there. The sections below cover the endpoints most commonly used by external consumers.

## Authentication

Most read endpoints are public. Authenticated requests use a Bearer token obtained via `skills-re auth login` (device flow):

```
Authorization: Bearer <token>
```

## Skills

### Search skills

```
POST /skills/search
```

**Body**

```json
{
  "query": "code review",
  "tags": ["testing"],
  "categories": ["development"],
  "limit": 20,
  "cursor": "<pagination-cursor>"
}
```

All fields are optional. Returns a paginated result with `page`, `continueCursor`, and `isDone`.

### Get skill by path

```
GET /skills/by-path?authorHandle=<handle>&skillSlug=<slug>
GET /skills/by-path?authorHandle=<handle>&repoName=<repo>&skillSlug=<slug>
```

### Submit a GitHub repository

```
POST /skills/submit-github-repo-public
```

Triggers discovery and ingestion of skills from a public GitHub repository. Used by the `/submit` page.

## CLI Endpoints

These endpoints are used by the `skills-re` CLI and follow the same authentication rules.

### Resolve install

```
GET /cli/skills/resolve-install?skill=<author/repo/skill>&version=<version>
```

Resolves the latest installable snapshot for a given skill path (and optional pinned version). Returns archive download URL, lock entry, and snapshot metadata.

### Download skill archive

```
GET /skills/download?snapshotId=<id>
```

Downloads the `.tar.gz` archive for an installed skill snapshot.

### Notify install

```
POST /cli/skills/notify-install
```

**Body:** `{ "repoUrl": "https://github.com/owner/repo", "ref": "<sha>" }`

Notifies the registry after a GitHub-sourced skill install so the repo can be indexed or synced.

## Auth

Device-flow endpoints used by `skills-re auth login`:

```
POST /auth/device/code
POST /auth/device/token
GET  /cli/auth/session
POST /cli/auth/revoke
```

## MCP Server

A Model Context Protocol server is available at:

```
GET/POST https://api.skills.re/mcp
```

Transport: streamable HTTP. Tools exposed: `search_skills`, `get_skill`, `get_my_saved_skills`, `save_skill`, `unsave_skill`, `record_skill_usage`, `get_my_recently_used`, `get_skill_recommendations`.

The local MCP server (stdio) is started with `skills-re mcp`. Run `skills-re mcp --remote-config` to print the full configuration block for both transports.
