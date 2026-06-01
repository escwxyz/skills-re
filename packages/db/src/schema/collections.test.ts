/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { collectionsSkillsTable, collectionsTable } from "./collections";

const getBuilderNames = (table: object) => {
  const builderKey = Object.getOwnPropertySymbols(table).find((symbol) =>
    String(symbol).includes("ExtraConfigBuilder"),
  );
  expect(builderKey).toBeDefined();

  const builders = (
    (table as Record<symbol, unknown>)[builderKey as symbol] as (table: object) => unknown[]
  )(table);

  return builders
    .map((item) => {
      const typedItem = item as { name?: string; config?: { name?: string } };
      return typedItem.name ?? typedItem.config?.name;
    })
    .filter((name): name is string => typeof name === "string");
};

describe("collections schema", () => {
  test("exports visibility and default marker columns", () => {
    expect(collectionsTable.kind.name).toBe("kind");
    expect(collectionsTable.visibility.name).toBe("visibility");
  });

  test("enforces one default collection per user", () => {
    expect(getBuilderNames(collectionsTable)).toContain("collections_user_default_unique");
  });

  test("tracks collection skill membership identity and creation time", () => {
    expect(collectionsSkillsTable.id.name).toBe("id");
    expect(collectionsSkillsTable.createdAt.name).toBe("created_at");
    expect(collectionsSkillsTable.updatedAt.name).toBe("updated_at");
  });

  test("migration backfills legacy saved skills into private default collections", () => {
    const migration = readFileSync(
      resolve(import.meta.dir, "../migrations/0020_narrow_micromax.sql"),
      "utf8",
    );

    expect(migration).toContain("UPDATE `collections` SET `visibility` = 'public'");
    expect(migration).toContain("FROM `saved_skills`");
    expect(migration).toContain("`kind`");
    expect(migration).toContain("`visibility`");
    expect(migration).toMatch(/'default',\s+'private'/);
    expect(migration).toContain("INSERT OR IGNORE INTO `collections_skills`");
  });
});
