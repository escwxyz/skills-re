/// <reference types="bun-types" />

import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";

const migrationFile = new URL("./0023_fts5_skill_search.sql", import.meta.url);
const databases: Database[] = [];

const createDatabase = () => {
  const database = new Database(":memory:");
  databases.push(database);
  return database;
};

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close();
  }
});

const applyMigration = async (database: Database) => {
  const migrationSql = await Bun.file(migrationFile).text();
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(`
    CREATE TABLE skills (
      id TEXT PRIMARY KEY NOT NULL
    );

    CREATE TABLE snapshots (
      id TEXT PRIMARY KEY NOT NULL
    );
  `);

  for (const statement of migrationSql.split("--> statement-breakpoint")) {
    if (statement.trim()) {
      database.exec(statement);
    }
  }
};

describe("D1 FTS5 migration smoke fixture", () => {
  test("creates, queries, updates, deletes, rebuilds, and integrity-checks an external-content FTS5 table", async () => {
    const database = createDatabase();
    await applyMigration(database);

    database
      .prepare("INSERT INTO skills (id) VALUES (?), (?)")
      .run("skill-1", "skill-2");
    database
      .prepare("INSERT INTO snapshots (id) VALUES (?), (?)")
      .run("snapshot-1", "snapshot-2");

    const insertDocument = database.prepare(`
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
    `);

    insertDocument.run(
      "skill-1",
      "snapshot-1",
      "hash-1",
      "Workflow Builder",
      "Automates repeatable tasks",
      "workflow-builder",
      "acme",
      "skills",
      "This skill designs zephyr automations.",
      37,
      524288,
      "indexed",
      "automation workflows",
      123,
    );
    insertDocument.run(
      "skill-2",
      "snapshot-2",
      "hash-2",
      "Image Editor",
      "Edits generated images",
      "image-editor",
      "acme",
      "skills",
      "This skill handles visual generation requests.",
      46,
      524288,
      "indexed",
      "images design",
      124,
    );

    const search = database.query<{ rank: number; skillId: string; title: string }, [string]>(`
      SELECT
        bm25(skills_fts, 4.0, 2.0, 3.0, 2.0, 2.0, 1.0, 1.5) AS rank,
        skill_search_documents.skill_id AS skillId,
        skill_search_documents.title
      FROM skills_fts
      JOIN skill_search_documents ON skill_search_documents.id = skills_fts.rowid
      WHERE skills_fts MATCH ?
      ORDER BY rank ASC, skill_search_documents.skill_id ASC
    `);

    expect(search.all("workflow")).toEqual([
      {
        rank: expect.any(Number),
        skillId: "skill-1",
        title: "Workflow Builder",
      },
    ]);

    database
      .prepare("UPDATE skill_search_documents SET body = ?, content_hash = ? WHERE skill_id = ?")
      .run("This skill was renamed and no longer mentions the original term.", "hash-3", "skill-1");

    expect(search.all("zephyr")).toEqual([]);
    expect(search.all("renamed")).toEqual([
      {
        rank: expect.any(Number),
        skillId: "skill-1",
        title: "Workflow Builder",
      },
    ]);

    database.prepare("DELETE FROM skill_search_documents WHERE skill_id = ?").run("skill-1");

    expect(search.all("renamed")).toEqual([]);

    database.exec("INSERT INTO skills_fts(skills_fts) VALUES('rebuild')");
    database.exec("INSERT INTO skills_fts(skills_fts) VALUES('integrity-check')");

    expect(search.all("visual")).toEqual([
      {
        rank: expect.any(Number),
        skillId: "skill-2",
        title: "Image Editor",
      },
    ]);
  });

  test("enforces relational uniqueness, capacity checks, and cascade cleanup", async () => {
    const database = createDatabase();
    await applyMigration(database);

    database.prepare("INSERT INTO skills (id) VALUES (?)").run("skill-1");
    database.prepare("INSERT INTO snapshots (id) VALUES (?)").run("snapshot-1");

    const insertDocument = database.prepare(`
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
        tags
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertDocument.run(
      "skill-1",
      "snapshot-1",
      "hash-1",
      "Workflow Builder",
      "Automates repeatable tasks",
      "workflow-builder",
      "acme",
      "skills",
      "body",
      4,
      524288,
      "indexed",
      "automation",
    );

    expect(() =>
      insertDocument.run(
        "skill-1",
        "snapshot-1",
        "hash-2",
        "Duplicate",
        "Duplicate",
        "duplicate",
        "acme",
        "skills",
        "body",
        4,
        524288,
        "indexed",
        "automation",
      ),
    ).toThrow(/UNIQUE constraint failed/);

    expect(() =>
      insertDocument.run(
        "missing",
        "snapshot-1",
        "hash-3",
        "Missing",
        "Missing",
        "missing",
        "acme",
        "skills",
        "body",
        4,
        524288,
        "indexed",
        "automation",
      ),
    ).toThrow(/FOREIGN KEY constraint failed/);

    expect(() =>
      insertDocument.run(
        "skill-1",
        "snapshot-1",
        "hash-4",
        "Bad",
        "Bad",
        "bad",
        "acme",
        "skills",
        "body",
        -1,
        524288,
        "indexed",
        "automation",
      ),
    ).toThrow(/CHECK constraint failed/);

    const search = database.query<{ count: number }, [string]>(`
      SELECT count(*) AS count
      FROM skills_fts
      WHERE skills_fts MATCH ?
    `);
    expect(search.get("workflow")?.count).toBe(1);

    database.prepare("DELETE FROM skills WHERE id = ?").run("skill-1");

    const rows = database
      .query<{ count: number }, []>("SELECT count(*) AS count FROM skill_search_documents")
      .get();
    expect(rows?.count).toBe(0);
    expect(search.get("workflow")?.count).toBe(0);

    database.exec("INSERT INTO skills_fts(skills_fts) VALUES('integrity-check')");
  });
});
