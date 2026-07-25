/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { skillSearchDocumentsRelations } from "./relations";
import { skillSearchDocumentsTable } from "./search-documents";

describe("skill search documents schema", () => {
  test("exports the source-document table and relations", () => {
    expect(skillSearchDocumentsTable).toBeDefined();
    expect(skillSearchDocumentsRelations).toBeDefined();
  });

  test("exposes the expected searchable and capacity columns", () => {
    expect(skillSearchDocumentsTable.id.name).toBe("id");
    expect(skillSearchDocumentsTable.skillId.name).toBe("skill_id");
    expect(skillSearchDocumentsTable.snapshotId.name).toBe("snapshot_id");
    expect(skillSearchDocumentsTable.contentHash.name).toBe("content_hash");
    expect(skillSearchDocumentsTable.title.name).toBe("title");
    expect(skillSearchDocumentsTable.description.name).toBe("description");
    expect(skillSearchDocumentsTable.slug.name).toBe("slug");
    expect(skillSearchDocumentsTable.authorHandle.name).toBe("author_handle");
    expect(skillSearchDocumentsTable.repository.name).toBe("repository");
    expect(skillSearchDocumentsTable.body.name).toBe("body");
    expect(skillSearchDocumentsTable.bodySizeBytes.name).toBe("body_size_bytes");
    expect(skillSearchDocumentsTable.maxIndexedBodyBytes.name).toBe("max_indexed_body_bytes");
    expect(skillSearchDocumentsTable.indexingStatus.name).toBe("indexing_status");
    expect(skillSearchDocumentsTable.tags.name).toBe("tags");
    expect(skillSearchDocumentsTable.updatedAt.name).toBe("updated_at");
  });

  test("declares uniqueness, capacity checks, and operational indexes", () => {
    const builderKey = Object.getOwnPropertySymbols(skillSearchDocumentsTable).find((symbol) =>
      String(symbol).includes("ExtraConfigBuilder"),
    );
    expect(builderKey).toBeDefined();
    const builders = (
      (skillSearchDocumentsTable as unknown as Record<symbol, unknown>)[builderKey as symbol] as (
        table: object,
      ) => unknown[]
    )(skillSearchDocumentsTable);
    const names = builders
      .map((item) => {
        const typedItem = item as { name?: string; config?: { name?: string } };
        return typedItem.name ?? typedItem.config?.name;
      })
      .filter((name): name is string => typeof name === "string");

    expect(names).toContain("skill_search_documents_body_size_non_negative");
    expect(names).toContain("skill_search_documents_max_indexed_body_bytes_positive");
    expect(names).toContain("skill_search_documents_indexing_status_valid");
    expect(names).toContain("skill_search_documents_snapshot_id_idx");
    expect(names).toContain("skill_search_documents_updated_at_id_idx");
    expect(names).toContain("skill_search_documents_skill_id_unique");
  });
});
