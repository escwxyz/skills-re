# FTS5 skill search operations

This document describes the D1 FTS5 keyword-search path for public skills. It replaces the removed static Pagefind index. Semantic search remains a separate AI Search path selected by `searchMode=semantic`.

## Ownership and schema

- Relational source of truth: `skills`, `repos`, `snapshots`, `snapshot_files`, `tags`, and `skills_tags`.
- Search document table: `skill_search_documents`.
- FTS table: `skills_fts`, an external-content FTS5 table owned by `skill_search_documents`.
- Migration: `packages/db/src/migrations/0023_fts5_skill_search.sql`.
- Drizzle schema: `packages/db/src/schema/search-documents.ts`.
- Repository query: `packages/api/src/modules/skills/fts-search-repo.ts`.

`skill_search_documents` stores one current public document per skill. It records `skill_id`, `snapshot_id`, `content_hash`, searchable metadata, indexed body text, original body byte size, max indexed body bytes, indexing status, and update time. Insert/update/delete triggers keep `skills_fts` synchronized. Skill-row deletion cascades through the search document table and removes FTS hits.

## Limits and capacity gates

- Max indexed body size: `524_288` UTF-8 bytes per skill body.
- Max keyword query length: `256` characters before tokenization.
- Max keyword query tokens: `8`.
- Capacity planning target: 20,000 skills.
- Internal database ceiling: 5 GB.
- Rollout safety threshold: 80% of the ceiling unless explicitly overridden.

Before enabling `shadow` or `fts5` in production, run the capacity report from `packages/api/src/modules/skills/search-documents-repo.ts` after backfill. Do not proceed if `blocksRollout` is true.

Local capacity fixture evidence from `scripts/search/measure-fts5-capacity.ts` using `eu-data/data.sql`, a 100MB current database assumption, and a 20,000-skill planning target:

- Public skills in export: 7,224.
- Public skills with entry files: 7,167.
- Body-size distribution: p50 7,471 bytes, p90 19,872 bytes, p95 26,190 bytes, p99 44,375 bytes, max 294,426 bytes.
- Metadata language samples: 6,062 ASCII, 656 accented, 449 CJK, 1,771 punctuation-heavy.
- Accepted indexed body limit: 524,288 bytes.
- Projected FTS/search storage at 20,000 skills: 334.8MB.
- Projected total database size at 20,000 skills: 434.8MB, below the 4GB rollout safety threshold and 5GB internal ceiling.

This local fixture is sufficient for the configured default limit. It does not replace the required production/staged post-backfill capacity report before enabling `shadow` or `fts5`.

Largest current body outliers in the measured export:

| Skill                                          |          Size |
| ---------------------------------------------- | ------------: |
| `quality-playbook` (`qcCUaehCTeHj23w_MOHdF`)   | 294,426 bytes |
| `ship` (`18wkuumMZdha5p0d9nu48`)               | 161,278 bytes |
| `shopify-hydrogen` (`EwUV4u7SGYUC0m4z2pcRn`)   | 142,557 bytes |
| `plan-ceo-review` (`0AdXOCi5sP3K9TcdSU2Cs`)    | 130,891 bytes |
| `office-hours` (`_Qy_-Oovu4r3DSdmLkkmq`)       | 110,915 bytes |
| `plan-design-review` (`lbWV_nf40Qbto8MQ4qahX`) | 105,583 bytes |
| `plan-devex-review` (`_-nNx-pzD3ARMjcgGDpe_`)  | 104,571 bytes |
| `plan-eng-review` (`oB6AKYo7edjHddpz8Pgac`)    |  99,125 bytes |
| `design-review` (`6D5qa6c_xYLA4jc7R0cqx`)      |  94,055 bytes |
| `autoplan` (`DtFkF1a-_w-PlNfOOdx0m`)           |  89,274 bytes |

## Synchronization paths

The index is updated by these paths:

- Current-snapshot promotion in `apps/server/src/workflows/skills-upload-runner.ts` calls `replaceSkillSearchDocument` after the `SKILL.md` object is durable and the current snapshot is committed.
- Tag mutation paths call `refreshSkillSearchDocumentMetadata` so tag text stays current without replacing the indexed body.
- Repository metadata sync calls `refreshRepoSkillSearchDocumentMetadata` for affected public skills.
- Visibility or deletion cleanup uses `deleteSkillSearchDocument`, and database cascades remove FTS rows when a skill row is deleted.
- Reconciliation removes orphaned/private documents and can rebuild or integrity-check `skills_fts`.

Indexing failures in ingestion paths are recoverable and should not roll back the authoritative skill write. Use repair mode to reconcile.

## Backfill and repair

Backfill is implemented by:

- `apps/server/src/workflows/skill-search-backfill.ts`
- `apps/server/src/workflows/skill-search-backfill-runner.ts`
- `packages/api/src/modules/skills/search-documents-repo.ts`

Workflow payload:

```json
{ "batchSize": 25, "mode": "backfill" }
```

Repair payload:

```json
{ "batchSize": 25, "mode": "repair" }
```

The runner:

- pages eligible public skills by stable cursor;
- reads the current `SKILL.md` object from snapshot storage;
- validates the stored SHA-256 digest;
- rejects stale snapshot writers;
- applies the body-size policy;
- reports indexed, skipped, stale, oversized, missing-object, hash-mismatch, failed, and processed counts;
- schedules continuation with the returned cursor.

Expected pre-rollout checks:

1. Run backfill to completion.
2. Run repair mode until no missing/stale/hash-mismatched rows remain.
3. Delete orphaned/private documents through reconciliation.
4. Run FTS integrity check.
5. Generate the database capacity report using the current production database byte size as `baseDatabaseBytes`.
6. Confirm projected total size at 20,000 skills stays below the safety threshold.

## D1 compatibility smoke

Local D1 smoke uses Wrangler's disposable `--local --persist-to` mode with `scripts/search/wrangler-fts5-smoke.jsonc`. It creates minimal parent tables, applies `packages/db/src/migrations/0023_fts5_skill_search.sql`, inserts a search document, verifies `MATCH`, updates the document, verifies the update trigger, runs `integrity-check`, runs `rebuild`, deletes the document, and verifies zero FTS hits remain.

Latest local result:

- Migration statements completed successfully.
- `MATCH 'alpha'` returned the inserted `Alpha Search` row.
- Updating the body to `beta body content` was visible through FTS.
- `integrity-check` and `rebuild` completed successfully.
- Deleting the source document left `hits_after_delete = 0`.

This confirms the migration and smoke statements work in the local Wrangler/Miniflare D1 integration environment. Remote disposable D1 and staged/production checks are still required before rollout.

## Rollout configuration

Server keyword strategy is parsed from `SKILL_KEYWORD_SEARCH_STRATEGY`:

- `like`: default; authoritative relational LIKE search.
- `shadow`: authoritative LIKE search plus bounded FTS5 comparison metrics.
- `fts5`: authoritative FTS5 keyword search.

Invalid or missing values resolve to `like`.

Rollout sequence:

1. Keep `like` until D1 compatibility, backfill, repair, integrity, and capacity checks pass.
2. Enable `shadow` and monitor comparison metrics.
3. Enable `fts5` in a staged environment and smoke-test keyword search, semantic isolation, filters, pagination, ingestion freshness, visibility cleanup, and rollback.
4. Enable `fts5` in production only after staged checks pass.

## Relevance fixture acceptance

Checked-in fixtures live in `packages/api/src/modules/skills/fts-relevance-fixtures.ts` and are evaluated by `packages/api/src/modules/skills/fts-search-repo.test.ts`. The fixture suite exercises the same FTS repository path used by shadow comparison, with LIKE remaining authoritative in actual `shadow` rollout mode.

Latest local acceptance:

| Scenario          | Query                 | Expected top result   | Result |
| ----------------- | --------------------- | --------------------- | ------ |
| Exact name        | `atlas deploy`        | `fixture-exact-name`  | Pass   |
| Metadata          | `github toolkit`      | `fixture-metadata`    | Pass   |
| Body-only         | `queue orchestration` | `fixture-body-only`   | Pass   |
| Punctuation-heavy | `react-hook-form zod` | `fixture-punctuation` | Pass   |
| Accented          | `cafe resume naive`   | `fixture-accented`    | Pass   |
| CJK               | `数据 搜索`           | `fixture-cjk`         | Pass   |

These local fixture results validate tokenizer/query construction and ranking behavior before environment rollout. Production/staged shadow metrics are still required before enabling authoritative `fts5`.

## Metrics and logging

Shadow metrics are emitted without raw query text:

- authoritative engine and result count;
- candidate engine and result count;
- FTS latency;
- failure flag;
- zero-result difference;
- top-result overlap and sample size.

Failure telemetry is also raw-query-free:

- engine;
- strategy;
- phase (`shadow` or `authoritative`);
- latency;
- whether fallback was applied.

In `shadow`, FTS failure falls back to the authoritative LIKE response. In `fts5`, FTS query execution failure is surfaced as a keyword search error; only invalid/empty FTS expressions fall back to the browse/LIKE path.

## Rollback

To roll back authoritative FTS5:

1. Set `SKILL_KEYWORD_SEARCH_STRATEGY=like`.
2. Redeploy or reload the Worker environment.
3. Confirm keyword search returns relational results and semantic search remains isolated.
4. Leave backfill and repair code in place; stale FTS rows are inert when strategy is `like`.
5. Use repair/rebuild later before re-entering `shadow` or `fts5`.

Rollback does not require restoring Pagefind infrastructure. Pagefind contracts, routes, package, workflow, R2 binding, frontend runtime, and dependency entries have been removed.

## Current rollout blockers

The following checks require Cloudflare credentials or production/staged environment access:

- D1 execution of the FTS5 migration and smoke statements.
- Current production database size and public corpus body-size distribution.
- Full production/staged backfill and actual post-backfill database-size report.
- Shadow relevance evaluation against production-like checked fixtures.
- Staged authoritative FTS5 smoke tests.
