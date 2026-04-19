/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { changelogsTable } from "./changelogs";

const getExtraConfigNames = (table: object) => {
  const builderKey = Object.getOwnPropertySymbols(table).find((symbol) =>
    String(symbol).includes("ExtraConfigBuilder"),
  );
  if (!builderKey) {
    return [];
  }

  return ((table as Record<symbol, unknown>)[builderKey] as (table: object) => unknown[])(table)
    .map((item) => {
      const typedItem = item as { name?: string; config?: { name?: string } };
      return typedItem.name ?? typedItem.config?.name;
    })
    .filter((name): name is string => typeof name === "string");
};

describe("changelogs schema", () => {
  test("exports the changelogs table", () => {
    expect(changelogsTable).toBeDefined();
  });

  test("exposes the expected core columns", () => {
    expect(changelogsTable.id.name).toBe("id");
    expect(changelogsTable.changesJson.name).toBe("changes_json");
    expect(changelogsTable.createdAt.name).toBe("created_at");
    expect(changelogsTable.description.name).toBe("description");
    expect(changelogsTable.isPublished.name).toBe("is_published");
    expect(changelogsTable.isStable.name).toBe("is_stable");
    expect(changelogsTable.title.name).toBe("title");
    expect(changelogsTable.type.name).toBe("type");
    expect(changelogsTable.versionMajor.name).toBe("version_major");
    expect(changelogsTable.versionMinor.name).toBe("version_minor");
    expect(changelogsTable.versionPatch.name).toBe("version_patch");
  });

  test("retains the legacy version checks and indexes", () => {
    const names = getExtraConfigNames(changelogsTable);
    expect(names).toContain("changelogs_version_major_non_negative");
    expect(names).toContain("changelogs_version_minor_non_negative");
    expect(names).toContain("changelogs_version_patch_non_negative");
    expect(names).toContain("changelogs_version_triplet_unique");
    expect(names).toContain("changelogs_publish_version_idx");
    expect(names).toContain("changelogs_version_idx");
  });
});
