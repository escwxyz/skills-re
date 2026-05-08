# Metrics Contract, API, and oRPC Split

Status: proposed

## Summary

This design moves all metrics-related behavior into a single `metrics` namespace that is split cleanly across three layers:

- `packages/contract` owns the oRPC contract and schemas.
- `packages/api` owns the metrics business logic and data access.
- `apps/start` consumes metrics through oRPC only.

The current metrics family spans both skill-level and snapshot-level concerns:

- Skill views and skill download aggregates are exposed to the UI.
- Snapshot downloads are recorded through the backend download flow, even though the metrics are reported at the skill level today.
- The daily skills/snapshots reporting pipeline stays in the same namespace.

## Goals

- Keep metrics logic out of TanStack Start page code.
- Make contract, service, and transport boundaries explicit.
- Use `metrics` as the single namespace for all metrics APIs.
- Keep snapshot downloads and skill engagement metrics aligned with the versioned download flow.
- Remove `source` from metrics responses.
- Preserve the current “best effort” behavior: metrics failures must not break skill detail views or archive downloads.

## Non-Goals

- Reworking unrelated domains such as auth, collections, search, or uploads.
- Moving binary archive download delivery into oRPC.
- Introducing a generic analytics DSL or a universal metric event API.
- Adding snapshot-specific read APIs until there is a concrete consumer.

## Proposed Structure

### 1. `packages/contract/src/metrics.ts`

The contract should remain the canonical schema surface for all metrics procedures.

Existing procedures stay in place:

- `metrics.dailySkillsSnapshots`
- `metrics.refreshDailySkillsSnapshots`

New procedures are added for skill engagement:

- `metrics.getSkillDownloadMetrics({ skillId })`
- `metrics.getSkillViewMetrics({ skillId })`
- `metrics.recordSkillView({ skillId, path? })`

Download recording is snapshot-aware. The backend download flow should record a snapshot download event after the archive is successfully resolved, but the public contract does not need to expose a separate client-facing snapshot read API yet.

### 2. `packages/api/src/modules/metrics/`

The API layer should own all business rules and storage access for metrics.

Recommended internal split:

- `shared.ts`
  - day bucket helpers
  - KV cache helpers
  - daily counter helpers
  - result types
- `daily` logic
  - the existing daily skills/snapshots refresh and list behavior
- `downloads` logic
  - skill download aggregates
  - successful download recording
- `views` logic
  - skill view aggregates
  - skill view recording

The API layer should use the existing Cloudflare bindings only:

- Analytics Engine bindings for event writes
- KV for counters and short-lived cache
- database repo functions for all-time counters

It should not call Cloudflare REST APIs for metrics reads.

### 3. `packages/api/src/routers/metrics.ts`

The router should be a thin adapter from contract to service.

It should:

- read input from the oRPC contract
- call the appropriate metrics service method
- return the service result unchanged
- keep authorization minimal and explicit

Suggested routing policy:

- `dailySkillsSnapshots` stays public
- `refreshDailySkillsSnapshots` stays admin-only
- `getSkillDownloadMetrics` stays public
- `getSkillViewMetrics` stays public
- `recordSkillView` stays public

### 4. `apps/start`

Start should stop calling backend metrics endpoints directly.

Instead, it should use the shared oRPC client:

- SSR/server functions use `createServerORPCClient()` when they need metrics data.
- client-side interactions use the existing `orpc.metrics.*` helpers.

The current Start-side fetch wrapper for metrics should be retired once the oRPC path is in place.

The binary download proxy can remain local to Start if needed, but it should only proxy the archive stream, not metrics logic.

## Data Flow

### Skill view

1. Start loads the skill detail page.
2. The page fetches `metrics.getSkillViewMetrics` through oRPC.
3. When the page records a view, Start calls `metrics.recordSkillView`.
4. The API layer writes the Analytics Engine event, increments KV daily counters, updates all-time counters, and clears the cache.
5. The response payload only contains counters and `updatedAt`; no `source` field.

### Skill download

1. The user clicks the download button.
2. Start continues to use its local download route to stream the archive.
3. The backend download route resolves the snapshot, streams the tar.gz object, and records the download through the shared metrics service.
4. The service increments all-time counts, writes the Analytics Engine event, updates KV daily counters, and clears the cache.
5. A metrics write failure must not fail the archive download response.

### Daily reporting

1. Cron or admin tooling refreshes the daily skills/snapshots materialization.
2. The API layer writes daily aggregates into the database.
3. Start reads those aggregates through the `metrics` oRPC contract when needed.

## Response Shape

All metrics read responses should be shape-stable and minimal:

- `allTime`
- `daily`
- `weekly`
- `updatedAt`

No provenance/source field should be returned.

## Error Handling

Metrics should remain best-effort.

- If the all-time counter read fails, return `0` and log the failure.
- If the KV daily/weekly lookup fails, return `0` for those buckets and log the failure.
- If cache reads or writes fail, continue with the uncached path or simply skip cache mutation.
- If event logging fails, do not fail the user-facing request unless the request itself is already invalid.

## Testing

The implementation should be covered at three levels:

- Contract tests for the new `metrics` procedures.
- API service tests for download/view reads and writes.
- Router tests for the oRPC adapters.
- Start-side tests for oRPC consumption and any remaining download proxy behavior.

Minimum assertions:

- contract inputs and outputs compile
- `source` is absent from read responses
- download/view reads still work with KV cache
- view recording updates the right counters and writes Analytics Engine events
- snapshot download recording does not fail the archive response when metrics logging fails

## Migration Plan

1. Extend `packages/contract/src/metrics.ts` with the new procedures.
2. Refactor metrics logic into `packages/api/src/modules/metrics/`.
3. Add or extract `packages/api/src/routers/metrics.ts` and wire it into the router index.
4. Switch Start consumers to oRPC metrics calls.
5. Remove the Start-side metrics fetch wrappers and any unused proxying paths.
6. Keep the binary archive download proxy in place.
7. Verify that the download route still records metrics through the shared API service.

## Decision Record

Chosen approach: Scheme A

- contract layer first
- API layer second
- oRPC router third
- Start as a consumer only

This keeps the boundaries clean while still allowing snapshot-aware metrics writes to share the same metrics module.
