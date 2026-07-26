import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { defaultLimit } from "../shared/pagination";
import type { SearchSkillRow } from "../shared/search-skill";
import { db } from "../shared/db";
import { buildSkillFtsMatchQuery } from "./fts-query";

type SearchSort =
  | "newest"
  | "updated"
  | "views"
  | "downloads-trending"
  | "downloads-all-time"
  | "stars";

export interface SearchSkillsByFtsInput {
  authorHandle?: string;
  categories?: string[];
  cursor?: string;
  limit?: number;
  minAuditScore?: number;
  minScore?: number;
  query?: string;
  repoName?: string;
  sort?: SearchSort;
  tags?: string[];
}

interface FtsSearchCursor {
  offset: number;
}

interface FtsSearchRow extends Omit<SearchSkillRow, "isVerified"> {
  isVerified: boolean | number;
  rank: number;
  tagsCsv: string | null;
}

interface FtsSearchDb {
  all<T = unknown>(query: SQL): Promise<T[]>;
}

const defaultFtsSearchDb = db as FtsSearchDb;
const MAX_FTS_SEARCH_LIMIT = 100;
const MAX_FTS_SEARCH_OFFSET = 10_000;

const encodeFtsSearchCursor = (cursor: FtsSearchCursor | null) => {
  if (!cursor) {
    return "";
  }

  return btoa(JSON.stringify(cursor)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const decodeFtsSearchCursor = (cursor: string | undefined) => {
  if (!cursor) {
    return 0;
  }

  try {
    const normalized = cursor
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(cursor.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(normalized)) as {
      offset?: unknown;
    };
    if (
      typeof parsed.offset === "number" &&
      Number.isInteger(parsed.offset) &&
      parsed.offset >= 0
    ) {
      return parsed.offset;
    }
  } catch {
    return 0;
  }

  return 0;
};

const normalizeFtsSearchLimit = (limit: number | undefined) => {
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit <= 0) {
    return defaultLimit;
  }

  return Math.min(limit, MAX_FTS_SEARCH_LIMIT);
};

const normalizeFtsSearchOffset = (cursor: string | undefined) =>
  Math.min(decodeFtsSearchCursor(cursor), MAX_FTS_SEARCH_OFFSET);

const cleanStringList = (values: string[] | undefined) =>
  (values ?? []).map((value) => value.trim()).filter(Boolean);

const inList = (values: string[]) =>
  sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );

const isValidMinimumScore = (value: number | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const latestAuditScoreSql = sql`(
  SELECT static_audits.overall_score
  FROM static_audits
  WHERE static_audits.snapshot_id = s.latest_snapshot_id
  ORDER BY static_audits.sync_time DESC
  LIMIT 1
)`;

const getBrowseSortSql = (sort: SearchSort | undefined) => {
  switch (sort) {
    case "downloads-all-time": {
      return sql`s.downloads_all_time DESC`;
    }
    case "downloads-trending": {
      return sql`s.downloads_trending DESC`;
    }
    case "stars": {
      return sql`r.stars DESC`;
    }
    case "updated": {
      return sql`s.updated_at DESC`;
    }
    case "views": {
      return sql`s.views_all_time DESC`;
    }
    case "newest": {
      return sql`s.sync_time DESC`;
    }
    default: {
      return sql`rank ASC`;
    }
  }
};

const getFilterSql = (input: SearchSkillsByFtsInput) => {
  const categories = cleanStringList(input.categories);
  const tags = cleanStringList(input.tags);
  const filters: SQL[] = [sql`s.visibility = 'public'`, sql`s.latest_snapshot_id = d.snapshot_id`];

  if (input.authorHandle?.trim()) {
    filters.push(sql`r.owner_handle = ${input.authorHandle.trim()}`);
  }
  if (input.repoName?.trim()) {
    filters.push(sql`r.name = ${input.repoName.trim()}`);
  }
  if (categories.length > 0) {
    filters.push(sql`s.primary_category IN (${inList(categories)})`);
  }
  if (isValidMinimumScore(input.minAuditScore)) {
    filters.push(sql`${latestAuditScoreSql} >= ${input.minAuditScore}`);
  }
  if (isValidMinimumScore(input.minScore)) {
    filters.push(sql`${latestAuditScoreSql} >= ${input.minScore}`);
  }
  if (tags.length > 0) {
    filters.push(sql`EXISTS (
      SELECT 1
      FROM skills_tags st_filter
      INNER JOIN tags t_filter ON t_filter.id = st_filter.tag_id
      WHERE st_filter.skill_id = s.id
        AND t_filter.slug IN (${inList(tags)})
    )`);
  }

  return sql.join(filters, sql` AND `);
};

const toSearchSkillRow = (row: FtsSearchRow): SearchSkillRow => {
  const { rank: _rank, tagsCsv, ...searchRow } = row;
  return {
    ...searchRow,
    isVerified: searchRow.isVerified === true || searchRow.isVerified === 1,
    tags: tagsCsv ? tagsCsv.split(",").filter(Boolean) : undefined,
  };
};

export const searchSkillsPageByFts = async (
  input: SearchSkillsByFtsInput,
  database: FtsSearchDb = defaultFtsSearchDb,
) => {
  const matchQuery = input.query ? buildSkillFtsMatchQuery(input.query) : null;
  if (!matchQuery) {
    return null;
  }

  const limit = normalizeFtsSearchLimit(input.limit);
  const offset = normalizeFtsSearchOffset(input.cursor);
  const rows = await database.all<FtsSearchRow>(sql`
    SELECT
      r.owner_handle AS authorHandle,
      s.created_at AS createdAt,
      s.description AS description,
      s.downloads_all_time AS downloadsAllTime,
      s.downloads_trending AS downloadsTrending,
      r.forks AS forkCount,
      s.id AS id,
      s.is_verified AS isVerified,
      s.latest_version AS latestVersion,
      r.license AS license,
      r.owner_avatar_url AS ownerAvatarUrl,
      s.primary_category AS primaryCategory,
      bm25(skills_fts, 4.0, 2.0, 3.0, 2.0, 2.0, 1.0, 1.5) AS rank,
      r.name AS repoName,
      r.url AS repoUrl,
      s.slug AS slug,
      r.stars AS stargazerCount,
      s.sync_time AS syncTime,
      (
        SELECT group_concat(DISTINCT t.slug)
        FROM skills_tags st
        INNER JOIN tags t ON t.id = st.tag_id
        WHERE st.skill_id = s.id
      ) AS tagsCsv,
      s.title AS title,
      s.updated_at AS updatedAt,
      s.views_all_time AS viewsAllTime
    FROM skills_fts
    INNER JOIN skill_search_documents d ON d.id = skills_fts.rowid
    INNER JOIN skills s ON s.id = d.skill_id
    INNER JOIN repos r ON r.id = s.repo_id
    WHERE skills_fts MATCH ${matchQuery.expression}
      AND ${getFilterSql(input)}
    ORDER BY ${getBrowseSortSql(input.sort)}, s.id ASC
    LIMIT ${limit + 1}
    OFFSET ${offset}
  `);

  const page = rows.slice(0, limit).map(toSearchSkillRow);
  const nextOffset = offset + page.length;

  return {
    continueCursor: encodeFtsSearchCursor(rows.length > limit ? { offset: nextOffset } : null),
    isDone: rows.length <= limit,
    page,
  };
};
