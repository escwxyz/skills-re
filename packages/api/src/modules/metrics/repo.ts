import { and, desc, gte, lte, sql } from "drizzle-orm";

import { dailyMetricsTable, snapshotsTable, skillsTable } from "@skills-re/db/schema";

import { db } from "../shared/db";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS_BACKFILL = 365;

export interface ListDailyMetricsInput {
  fromDay?: string;
  limit?: number;
  toDay?: string;
}

export interface RefreshDailyMetricsInput {
  backfillDays?: number;
  nowMs?: number;
}

export interface DailyMetricsRow {
  day: string;
  newSkills: number;
  newSnapshots: number;
  updatedAtMs: number;
}

const toStartOfUtcDayMs = (timeMs: number) => {
  const date = new Date(timeMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const toDayBucket = (timeMs: number) => new Date(timeMs).toISOString().slice(0, 10);

const clampBackfillDays = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 7;
  }

  const normalized = Math.trunc(value);
  return Math.max(1, Math.min(normalized, MAX_DAYS_BACKFILL));
};

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDay = (value: string | undefined) => {
  if (!(value && dayPattern.test(value))) {
    return null;
  }

  return value;
};

export async function refreshDailySkillsAndSnapshotsMetrics(
  input?: RefreshDailyMetricsInput,
  database = db,
) {
  const nowMs = input?.nowMs ?? Date.now();
  const backfillDays = clampBackfillDays(input?.backfillDays);
  const endDayStartMs = toStartOfUtcDayMs(nowMs);
  const startDayStartMs = endDayStartMs - (backfillDays - 1) * DAY_IN_MS;
  const rangeEndExclusiveMs = endDayStartMs + DAY_IN_MS;

  await database.run(sql`
    INSERT INTO "daily_metrics" ("day", "new_skills", "new_snapshots", "updated_at_ms")
    WITH RECURSIVE days(day_ms) AS (
      SELECT ${startDayStartMs}
      UNION ALL
      SELECT day_ms + ${DAY_IN_MS}
      FROM days
      WHERE day_ms < ${endDayStartMs}
    ),
    range_days AS (
      SELECT date(day_ms / 1000, 'unixepoch') AS day
      FROM days
    ),
    skill_counts AS (
      SELECT
        date(coalesce(${skillsTable.createdAt}, ${skillsTable.syncTime}) / 1000, 'unixepoch') AS day,
        count(*) AS count
      FROM ${skillsTable}
      WHERE coalesce(${skillsTable.createdAt}, ${skillsTable.syncTime}) >= ${startDayStartMs}
        AND coalesce(${skillsTable.createdAt}, ${skillsTable.syncTime}) < ${rangeEndExclusiveMs}
      GROUP BY 1
    ),
    snapshot_counts AS (
      SELECT
        date(coalesce(${snapshotsTable.createdAtMs}, ${snapshotsTable.syncTime}) / 1000, 'unixepoch') AS day,
        count(*) AS count
      FROM ${snapshotsTable}
      WHERE coalesce(${snapshotsTable.createdAtMs}, ${snapshotsTable.syncTime}) >= ${startDayStartMs}
        AND coalesce(${snapshotsTable.createdAtMs}, ${snapshotsTable.syncTime}) < ${rangeEndExclusiveMs}
      GROUP BY 1
    )
    SELECT
      range_days.day,
      coalesce(skill_counts.count, 0),
      coalesce(snapshot_counts.count, 0),
      ${nowMs}
    FROM range_days
    LEFT JOIN skill_counts ON skill_counts.day = range_days.day
    LEFT JOIN snapshot_counts ON snapshot_counts.day = range_days.day
    ON CONFLICT("day") DO UPDATE SET
      "new_skills" = excluded."new_skills",
      "new_snapshots" = excluded."new_snapshots",
      "updated_at_ms" = excluded."updated_at_ms";
  `);

  return {
    days: backfillDays,
    fromDay: toDayBucket(startDayStartMs),
    toDay: toDayBucket(endDayStartMs),
    updatedAtMs: nowMs,
  };
}

export async function listDailySkillsAndSnapshotsMetrics(
  input?: ListDailyMetricsInput,
  database = db,
) {
  const fromDay = normalizeDay(input?.fromDay);
  const toDay = normalizeDay(input?.toDay);
  const limit = Math.max(1, Math.min(Math.trunc(input?.limit ?? 90), 365));

  let whereClause:
    | ReturnType<typeof and>
    | ReturnType<typeof gte>
    | ReturnType<typeof lte>
    | undefined;
  if (fromDay && toDay) {
    whereClause = and(gte(dailyMetricsTable.day, fromDay), lte(dailyMetricsTable.day, toDay));
  } else if (fromDay) {
    whereClause = gte(dailyMetricsTable.day, fromDay);
  } else if (toDay) {
    whereClause = lte(dailyMetricsTable.day, toDay);
  }

  const rows = await database
    .select({
      day: dailyMetricsTable.day,
      newSnapshots: dailyMetricsTable.newSnapshots,
      newSkills: dailyMetricsTable.newSkills,
      updatedAtMs: dailyMetricsTable.updatedAtMs,
    })
    .from(dailyMetricsTable)
    .where(whereClause)
    .orderBy(desc(dailyMetricsTable.day))
    .limit(limit);

  return rows.toReversed() as DailyMetricsRow[];
}
