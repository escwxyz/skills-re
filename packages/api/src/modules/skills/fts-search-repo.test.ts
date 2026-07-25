/// <reference types="bun-types" />

import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import type { SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

import { ftsRelevanceCases, ftsRelevanceDocuments } from "./fts-relevance-fixtures";
import { searchSkillsPageByFts } from "./fts-search-repo";

const migrationFile = new URL(
  "../../../../../packages/db/src/migrations/0023_fts5_skill_search.sql",
  import.meta.url,
);
const databases: Database[] = [];

class BunSqliteFtsSearchDb {
  private readonly dialect = new SQLiteSyncDialect();

  constructor(private readonly database: Database) {}

  all<T = unknown>(query: SQL): Promise<T[]> {
    const rendered = this.dialect.sqlToQuery(query);
    return Promise.resolve(this.database.query<T, unknown[]>(rendered.sql).all(...rendered.params));
  }
}

const createDatabase = async () => {
  const database = new Database(":memory:");
  databases.push(database);
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(`
    CREATE TABLE repos (
      id TEXT PRIMARY KEY NOT NULL,
      owner_handle TEXT NOT NULL,
      name TEXT NOT NULL,
      forks INTEGER NOT NULL DEFAULT 0,
      license TEXT,
      owner_avatar_url TEXT,
      url TEXT,
      stars INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE skills (
      id TEXT PRIMARY KEY NOT NULL,
      repo_id TEXT NOT NULL,
      latest_snapshot_id TEXT,
      visibility TEXT NOT NULL DEFAULT 'public',
      created_at INTEGER NOT NULL,
      description TEXT NOT NULL,
      downloads_all_time INTEGER NOT NULL DEFAULT 0,
      downloads_trending INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      latest_version TEXT,
      primary_category TEXT,
      slug TEXT NOT NULL,
      sync_time INTEGER NOT NULL,
      title TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      views_all_time INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (repo_id) REFERENCES repos(id)
    );

    CREATE TABLE snapshots (
      id TEXT PRIMARY KEY NOT NULL
    );

    CREATE TABLE static_audits (
      id TEXT PRIMARY KEY NOT NULL,
      snapshot_id TEXT NOT NULL,
      overall_score INTEGER NOT NULL,
      sync_time INTEGER NOT NULL
    );

    CREATE TABLE tags (
      id TEXT PRIMARY KEY NOT NULL,
      slug TEXT NOT NULL
    );

    CREATE TABLE skills_tags (
      skill_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      FOREIGN KEY (skill_id) REFERENCES skills(id),
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    );
  `);

  const migrationSql = await Bun.file(migrationFile).text();
  for (const statement of migrationSql.split("--> statement-breakpoint")) {
    if (statement.trim()) {
      database.exec(statement);
    }
  }

  return database;
};

const insertRepo = (database: Database, id: string, ownerHandle: string, name: string) => {
  database
    .prepare(`
      INSERT INTO repos (id, owner_handle, name, forks, license, owner_avatar_url, url, stars)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(id, ownerHandle, name, 2, "MIT", null, `https://github.com/${ownerHandle}/${name}`, 5);
};

const insertSnapshot = (database: Database, id: string) => {
  database.prepare("INSERT INTO snapshots (id) VALUES (?)").run(id);
};

const insertStaticAudit = (database: Database, snapshotId: string, overallScore: number) => {
  database
    .prepare(`
      INSERT INTO static_audits (id, snapshot_id, overall_score, sync_time)
      VALUES (?, ?, ?, ?)
    `)
    .run(`audit-${snapshotId}-${overallScore}`, snapshotId, overallScore, overallScore);
};

const insertSkill = (
  database: Database,
  input: {
    category?: string | null;
    id: string;
    latestSnapshotId: string;
    repoId: string;
    slug: string;
    title: string;
    visibility?: "public" | "private";
  },
) => {
  database
    .prepare(`
      INSERT INTO skills (
        id,
        repo_id,
        latest_snapshot_id,
        visibility,
        created_at,
        description,
        downloads_all_time,
        downloads_trending,
        is_verified,
        latest_version,
        primary_category,
        slug,
        sync_time,
        title,
        updated_at,
        views_all_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.id,
      input.repoId,
      input.latestSnapshotId,
      input.visibility ?? "public",
      1,
      `${input.title} description`,
      10,
      1,
      1,
      "1.0.0",
      input.category ?? null,
      input.slug,
      100,
      input.title,
      200,
      20,
    );
};

const insertSearchDocument = (
  database: Database,
  input: {
    authorHandle: string;
    body: string;
    contentHash?: string;
    description?: string;
    repository: string;
    skillId: string;
    slug: string;
    snapshotId: string;
    tags?: string;
    title: string;
  },
) => {
  database
    .prepare(`
      INSERT INTO skill_search_documents (
        skill_id,
        snapshot_id,
        content_hash,
        title,
        description,
        slug,
        author_handle,
        repository,
        body,
        body_size_bytes,
        max_indexed_body_bytes,
        indexing_status,
        tags,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.skillId,
      input.snapshotId,
      input.contentHash ?? `${input.skillId}-hash`,
      input.title,
      input.description ?? `${input.title} description`,
      input.slug,
      input.authorHandle,
      input.repository,
      input.body,
      new TextEncoder().encode(input.body).byteLength,
      524_288,
      "indexed",
      input.tags ?? "",
      200,
    );
};

const insertTag = (database: Database, skillId: string, tagId: string, slug: string) => {
  database.prepare("INSERT OR IGNORE INTO tags (id, slug) VALUES (?, ?)").run(tagId, slug);
  database.prepare("INSERT INTO skills_tags (skill_id, tag_id) VALUES (?, ?)").run(skillId, tagId);
};

const encodeFtsCursor = (offset: number) =>
  btoa(JSON.stringify({ offset })).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close();
  }
});

describe("searchSkillsPageByFts", () => {
  test("returns null when the query cannot produce an FTS expression", async () => {
    const calls: unknown[] = [];
    const db = {
      all(query: unknown) {
        calls.push(query);
        return Promise.resolve([]);
      },
    };

    await expect(searchSkillsPageByFts({ query: "✨" }, db as never)).resolves.toBeNull();
    expect(calls).toEqual([]);
  });

  test("maps ranked rows into the public search row shape with limit-plus-one pagination", async () => {
    const calls: unknown[] = [];
    const db = {
      all(query: unknown) {
        calls.push(query);
        return Promise.resolve([
          {
            authorHandle: "acme",
            createdAt: 1,
            description: "First",
            downloadsAllTime: 2,
            downloadsTrending: 3,
            forkCount: 4,
            id: "skill-1",
            isVerified: true,
            latestVersion: "1.0.0",
            license: "MIT",
            ownerAvatarUrl: null,
            primaryCategory: "automation",
            rank: -1.2,
            repoName: "skills",
            repoUrl: "https://github.com/acme/skills",
            slug: "workflow",
            stargazerCount: 5,
            syncTime: 6,
            tagsCsv: "automation,search",
            title: "Workflow",
            updatedAt: 7,
            viewsAllTime: 8,
          },
          {
            authorHandle: "acme",
            createdAt: 1,
            description: "Second",
            downloadsAllTime: 2,
            downloadsTrending: 3,
            forkCount: 4,
            id: "skill-2",
            isVerified: false,
            latestVersion: null,
            license: null,
            ownerAvatarUrl: null,
            primaryCategory: null,
            rank: -0.2,
            repoName: "skills",
            repoUrl: "https://github.com/acme/skills",
            slug: "image",
            stargazerCount: 5,
            syncTime: 6,
            tagsCsv: null,
            title: "Image",
            updatedAt: 7,
            viewsAllTime: 8,
          },
        ]);
      },
    };

    await expect(
      searchSkillsPageByFts(
        {
          authorHandle: "acme",
          categories: ["automation"],
          limit: 1,
          query: "workflow",
          repoName: "skills",
          tags: ["search"],
        },
        db as never,
      ),
    ).resolves.toEqual({
      continueCursor: "eyJvZmZzZXQiOjF9",
      isDone: false,
      page: [
        {
          authorHandle: "acme",
          createdAt: 1,
          description: "First",
          downloadsAllTime: 2,
          downloadsTrending: 3,
          forkCount: 4,
          id: "skill-1",
          isVerified: true,
          latestVersion: "1.0.0",
          license: "MIT",
          ownerAvatarUrl: null,
          primaryCategory: "automation",
          repoName: "skills",
          repoUrl: "https://github.com/acme/skills",
          slug: "workflow",
          stargazerCount: 5,
          syncTime: 6,
          tags: ["automation", "search"],
          title: "Workflow",
          updatedAt: 7,
          viewsAllTime: 8,
        },
      ],
    });
    expect(calls).toHaveLength(1);
  });

  test("clamps oversized FTS pagination inputs before rendering SQL", async () => {
    const dialect = new SQLiteSyncDialect();
    const calls: ReturnType<SQLiteSyncDialect["sqlToQuery"]>[] = [];
    const db = {
      all(query: SQL) {
        calls.push(dialect.sqlToQuery(query));
        return Promise.resolve([]);
      },
    };

    await expect(
      searchSkillsPageByFts(
        {
          cursor: encodeFtsCursor(1_000_000),
          limit: 500,
          query: "workflow",
        },
        db,
      ),
    ).resolves.toEqual({
      continueCursor: "",
      isDone: true,
      page: [],
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.params).toContain(101);
    expect(calls[0]?.params).toContain(10_000);
  });

  test("searches a migrated SQLite FTS table with ranking, exclusion, filters, pagination, and zero-match behavior", async () => {
    const database = await createDatabase();
    const ftsDb = new BunSqliteFtsSearchDb(database);
    insertRepo(database, "repo-acme", "acme", "skills");
    insertRepo(database, "repo-beta", "beta", "tools");
    for (const snapshotId of [
      "snapshot-title",
      "snapshot-body",
      "snapshot-stale",
      "snapshot-current",
      "snapshot-private",
      "snapshot-beta",
    ]) {
      insertSnapshot(database, snapshotId);
    }

    insertSkill(database, {
      category: "automation",
      id: "skill-title",
      latestSnapshotId: "snapshot-title",
      repoId: "repo-acme",
      slug: "zephyr-title",
      title: "Zephyr Builder",
    });
    insertSearchDocument(database, {
      authorHandle: "acme",
      body: "Creates deterministic workflow plans.",
      repository: "skills",
      skillId: "skill-title",
      slug: "zephyr-title",
      snapshotId: "snapshot-title",
      tags: "automation search",
      title: "Zephyr Builder",
    });
    insertStaticAudit(database, "snapshot-title", 95);
    insertTag(database, "skill-title", "tag-automation", "automation");
    insertTag(database, "skill-title", "tag-search", "search");

    insertSkill(database, {
      category: "automation",
      id: "skill-body",
      latestSnapshotId: "snapshot-body",
      repoId: "repo-acme",
      slug: "body-match",
      title: "Workflow Notes",
    });
    insertSearchDocument(database, {
      authorHandle: "acme",
      body: "This body mentions zephyr once for body-only ranking.",
      repository: "skills",
      skillId: "skill-body",
      slug: "body-match",
      snapshotId: "snapshot-body",
      tags: "automation",
      title: "Workflow Notes",
    });
    insertStaticAudit(database, "snapshot-body", 60);
    insertTag(database, "skill-body", "tag-automation", "automation");

    insertSkill(database, {
      category: "automation",
      id: "skill-stale",
      latestSnapshotId: "snapshot-current",
      repoId: "repo-acme",
      slug: "stale",
      title: "Hidden Stale",
    });
    insertSearchDocument(database, {
      authorHandle: "acme",
      body: "hidden zephyr stale document",
      repository: "skills",
      skillId: "skill-stale",
      slug: "stale",
      snapshotId: "snapshot-stale",
      title: "Hidden Stale",
    });

    insertSkill(database, {
      category: "automation",
      id: "skill-private",
      latestSnapshotId: "snapshot-private",
      repoId: "repo-acme",
      slug: "private",
      title: "Hidden Private",
      visibility: "private",
    });
    insertSearchDocument(database, {
      authorHandle: "acme",
      body: "hidden zephyr private document",
      repository: "skills",
      skillId: "skill-private",
      slug: "private",
      snapshotId: "snapshot-private",
      title: "Hidden Private",
    });

    insertSkill(database, {
      category: "design",
      id: "skill-beta",
      latestSnapshotId: "snapshot-beta",
      repoId: "repo-beta",
      slug: "beta-design",
      title: "Beta Design",
    });
    insertSearchDocument(database, {
      authorHandle: "beta",
      body: "zephyr design body",
      repository: "tools",
      skillId: "skill-beta",
      slug: "beta-design",
      snapshotId: "snapshot-beta",
      tags: "design",
      title: "Beta Design",
    });
    insertStaticAudit(database, "snapshot-beta", 85);
    insertTag(database, "skill-beta", "tag-design", "design");

    const ranked = await searchSkillsPageByFts(
      {
        limit: 10,
        query: "zephyr",
      },
      ftsDb,
    );
    expect(ranked?.page.map((row) => row.id)).toEqual(["skill-title", "skill-beta", "skill-body"]);
    expect(ranked?.page.map((row) => row.id)).not.toContain("skill-stale");
    expect(ranked?.page.map((row) => row.id)).not.toContain("skill-private");

    await expect(
      searchSkillsPageByFts(
        {
          authorHandle: "acme",
          categories: ["automation"],
          query: "zephyr",
          repoName: "skills",
          tags: ["search"],
        },
        ftsDb,
      ),
    ).resolves.toMatchObject({
      isDone: true,
      page: [
        {
          id: "skill-title",
          tags: ["automation", "search"],
        },
      ],
    });

    const firstPage = await searchSkillsPageByFts(
      {
        limit: 1,
        query: "zephyr",
      },
      ftsDb,
    );
    expect(firstPage).toMatchObject({
      isDone: false,
      page: [{ id: "skill-title" }],
    });

    await expect(
      searchSkillsPageByFts(
        {
          cursor: firstPage?.continueCursor,
          limit: 1,
          query: "zephyr",
        },
        ftsDb,
      ),
    ).resolves.toMatchObject({
      isDone: false,
      page: [{ id: "skill-beta" }],
    });

    await expect(searchSkillsPageByFts({ query: "nomatch" }, ftsDb)).resolves.toEqual({
      continueCursor: "",
      isDone: true,
      page: [],
    });

    await expect(
      searchSkillsPageByFts(
        {
          minAuditScore: 90,
          minScore: 70,
          query: "zephyr",
        },
        ftsDb,
      ),
    ).resolves.toMatchObject({
      isDone: true,
      page: [{ id: "skill-title" }],
    });
  });

  test("meets checked-in relevance fixtures for shadow-mode evaluation cases", async () => {
    const database = await createDatabase();
    const ftsDb = new BunSqliteFtsSearchDb(database);

    for (const document of ftsRelevanceDocuments) {
      insertRepo(database, `repo-${document.skillId}`, document.authorHandle, document.repository);
      insertSnapshot(database, document.snapshotId);
      insertSkill(database, {
        id: document.skillId,
        latestSnapshotId: document.snapshotId,
        repoId: `repo-${document.skillId}`,
        slug: document.slug,
        title: document.title,
      });
      insertSearchDocument(database, document);
    }

    const acceptanceResults: Record<string, string | undefined> = {};
    for (const relevanceCase of ftsRelevanceCases) {
      const result = await searchSkillsPageByFts(
        {
          limit: 5,
          query: relevanceCase.query,
        },
        ftsDb,
      );
      const topSkillId = result?.page[0]?.id;
      acceptanceResults[relevanceCase.scenario] = topSkillId;
      expect(topSkillId, relevanceCase.scenario).toBe(relevanceCase.expectedTopSkillId);
    }

    expect(acceptanceResults).toEqual({
      accented: "fixture-accented",
      "body-only": "fixture-body-only",
      cjk: "fixture-cjk",
      "exact-name": "fixture-exact-name",
      metadata: "fixture-metadata",
      "punctuation-heavy": "fixture-punctuation",
    });
  });
});
