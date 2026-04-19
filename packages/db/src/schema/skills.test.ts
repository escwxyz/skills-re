/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  skillsRelations,
  skillsTable,
  skillsTagsRelations,
  skillsTagsTable,
} from "./skills";

describe("skills schema", () => {
  test("exports the skills tables and relations", () => {
    expect(skillsTable).toBeDefined();
    expect(skillsTagsTable).toBeDefined();
    expect(skillsRelations).toBeDefined();
    expect(skillsTagsRelations).toBeDefined();
  });

  test("exposes the expected core columns", () => {
    expect(skillsTable.id.name).toBe("id");
    expect(skillsTable.title.name).toBe("title");
    expect(skillsTable.slug.name).toBe("slug");
    expect(skillsTable.description.name).toBe("description");
    expect(skillsTable.visibility.name).toBe("visibility");
    expect(skillsTable.categoryId.name).toBe("category_id");
    expect(skillsTable.repoId.name).toBe("repo_id");
    expect(skillsTable.userId.name).toBe("user_id");
    expect(skillsTable.latestEvaluationId.name).toBe("latest_evaluation_id");
    expect(skillsTable.latestSnapshotId.name).toBe("latest_snapshot_id");
    expect(skillsTable.latestCommitSha.name).toBe("latest_commit_sha");
    expect(skillsTable.latestCommitUrl.name).toBe("latest_commit_url");
    expect(skillsTable.latestCommitDate.name).toBe("latest_commit_date");
    expect(skillsTable.latestCommitMessage.name).toBe("latest_commit_message");
    expect(skillsTable.createdAt.name).toBe("created_at");
    expect(skillsTable.downloadsTrending.name).toBe("downloads_trending");
    expect(skillsTable.latestVersion.name).toBe("latest_version");
    expect(skillsTable.primaryCategory.name).toBe("primary_category");
    expect(skillsTable.downloadsAllTime.name).toBe("downloads_all_time");
    expect(skillsTable.stargazerCount.name).toBe("stargazer_count");
    expect(skillsTable.viewsAllTime.name).toBe("views_all_time");
  });

  test("retains the legacy count and sync checks", () => {
    const builderKey = Object.getOwnPropertySymbols(skillsTable).find((symbol) =>
      String(symbol).includes("ExtraConfigBuilder"),
    );
    expect(builderKey).toBeDefined();
    const builders = ((skillsTable as Record<symbol, unknown>)[builderKey as symbol] as (
      table: object,
    ) => unknown[])(skillsTable);
    const names = builders
      .map((item) => {
        const typedItem = item as { name?: string; config?: { name?: string } };
        return typedItem.name ?? typedItem.config?.name;
      })
      .filter((name): name is string => typeof name === "string");

    expect(names).toContain("skills_downloads_all_time_non_negative");
    expect(names).toContain("skills_created_at_ms_non_negative");
    expect(names).toContain("skills_sync_time_non_negative");
  });
});
