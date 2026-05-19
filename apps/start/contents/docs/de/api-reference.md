---
title: API-Referenz
description: REST-API zum programmatischen Abfragen und Installieren von Skills.
category: Referenz
order: 5
updatedAt: 2026-05-19
---

## Basis-URL

```
https://api.skills.re
```

## Interaktive Dokumentation

Die vollständige OpenAPI-Spezifikation ist verfügbar unter:

```
https://api.skills.re/docs
```

Alle Anfrage- und Antwortschemata sind dort definiert. Die folgenden Abschnitte behandeln die am häufigsten von externen Konsumenten verwendeten Endpunkte.

## Authentifizierung

Die meisten Lese-Endpunkte sind öffentlich. Authentifizierte Anfragen verwenden ein Bearer-Token, das über `skills-re auth login` (Device-Flow) bezogen wird:

```
Authorization: Bearer <token>
```

## Skills

### Skills suchen

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

Alle Felder sind optional. Gibt ein paginiertes Ergebnis mit `page`, `continueCursor` und `isDone` zurück.

### Skill nach Pfad abrufen

```
GET /skills/by-path?authorHandle=<handle>&skillSlug=<slug>
GET /skills/by-path?authorHandle=<handle>&repoName=<repo>&skillSlug=<slug>
```

### Slug zu vollständigem Pfad auflösen

```
GET /skills/resolve-path?slug=<slug>
```

Gibt `{ authorHandle, repoName, skillSlug }` für einen gegebenen eindeutigen Slug zurück.

### GitHub-Repository einreichen

```
POST /skills/submit-github-repo-public
```

Löst die Erkennung und Erfassung von Skills aus einem öffentlichen GitHub-Repository aus. Wird von der Seite `/submit` verwendet.

## CLI-Endpunkte

Diese Endpunkte werden von der `skills-re` CLI verwendet.

### Installation auflösen

```
GET /cli/skills/resolve-install?skill=<slug>&version=<version>
```

Löst den neuesten installierbaren Snapshot für einen gegebenen Slug auf.

### Skill-Archiv herunterladen

```
GET /skills/download?snapshotId=<id>
```

Lädt das `.tar.gz`-Archiv für einen installierten Skill-Snapshot herunter.

### Installation benachrichtigen

```
POST /cli/skills/notify-install
```

**Body:** `{ "repoUrl": "https://github.com/owner/repo", "ref": "<sha>" }`

## Authentifizierungs-Endpunkte

```
POST /auth/device/code
POST /auth/device/token
GET  /cli/auth/session
POST /cli/auth/revoke
```

## MCP-Server

Ein Model Context Protocol-Server ist verfügbar unter:

```
GET/POST https://api.skills.re/mcp
```

Transport: Streamable HTTP. Lokalen MCP-Server starten: `skills-re mcp`. Konfiguration anzeigen: `skills-re mcp --remote-config`.
