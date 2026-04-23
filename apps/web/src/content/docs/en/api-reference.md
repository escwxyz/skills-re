---
title: API Reference
description: REST API for querying, installing, and managing skills programmatically.
category: Reference
order: 4
updatedAt: 2025-01-01
---

## Base URL

```
https://api.skills.re/v1
```

All endpoints return JSON. Authentication uses Bearer tokens from **Settings → API Tokens**.

## Skills

### GET /skills

List skills with optional filtering.

**Query parameters**

| Parameter  | Type    | Description                              |
| ---------- | ------- | ---------------------------------------- |
| `q`        | string  | Full-text search query                   |
| `tag`      | string  | Filter by tag                            |
| `author`   | string  | Filter by publisher handle               |
| `page`     | integer | Page number (default: 1)                 |
| `per_page` | integer | Results per page (default: 20, max: 100) |

**Example**

```bash
curl https://api.skills.re/v1/skills?q=code+review&tag=development
```

### GET /skills/:slug

Fetch a single skill by slug.

```bash
curl https://api.skills.re/v1/skills/code-review
```

**Response**

```json
{
  "id": "SR-0001",
  "slug": "code-review",
  "name": "code-review",
  "description": "A diff-first code reviewer...",
  "version": "2.4.1",
  "license": "MIT",
  "compatibility": ["claude-code", "claude-api"],
  "author": { "handle": "anthropic-labs", "name": "Anthropic Labs" },
  "tags": ["development", "quality"],
  "createdAt": "2024-06-01T00:00:00Z",
  "updatedAt": "2025-01-15T00:00:00Z"
}
```

### GET /skills/:slug/raw

Download the raw `SKILL.md` content.

```bash
curl https://api.skills.re/v1/skills/code-review/raw
```

## Authors

### GET /authors/:handle

Fetch an author profile and their published skills.

```bash
curl https://api.skills.re/v1/authors/anthropic-labs
```

## Rate Limits

Unauthenticated requests: **60 req/hour**. Authenticated requests: **5000 req/hour**. Rate limit headers are returned on every response.
