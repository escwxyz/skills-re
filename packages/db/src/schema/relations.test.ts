/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  accountsRelations,
  categoriesRelations,
  reposRelations,
  reviewsRelations,
  sessionsRelations,
  skillsRelations,
  skillsTagsRelations,
  snapshotFilesRelations,
  snapshotsRelations,
  staticAuditsRelations,
  tagsRelations,
  usersRelations,
} from "./relations";

describe("relations", () => {
  test("exports all expected relation objects", () => {
    expect(usersRelations).toBeDefined();
    expect(sessionsRelations).toBeDefined();
    expect(accountsRelations).toBeDefined();
    expect(categoriesRelations).toBeDefined();
    expect(reposRelations).toBeDefined();
    expect(skillsRelations).toBeDefined();
    expect(skillsTagsRelations).toBeDefined();
    expect(snapshotsRelations).toBeDefined();
    expect(snapshotFilesRelations).toBeDefined();
    expect(reviewsRelations).toBeDefined();
    expect(staticAuditsRelations).toBeDefined();
    expect(tagsRelations).toBeDefined();
  });

  test("usersRelations is a drizzle relations object", () => {
    // drizzle relations objects have a dbName and a config that includes the relation map
    expect(typeof usersRelations).toBe("object");
    expect(usersRelations).not.toBeNull();
  });

  test("sessionsRelations is a drizzle relations object", () => {
    expect(typeof sessionsRelations).toBe("object");
    expect(sessionsRelations).not.toBeNull();
  });

  test("accountsRelations is a drizzle relations object", () => {
    expect(typeof accountsRelations).toBe("object");
    expect(accountsRelations).not.toBeNull();
  });

  test("reposRelations is a drizzle relations object", () => {
    expect(typeof reposRelations).toBe("object");
    expect(reposRelations).not.toBeNull();
  });

  test("skillsRelations is a drizzle relations object", () => {
    expect(typeof skillsRelations).toBe("object");
    expect(skillsRelations).not.toBeNull();
  });

  test("skillsTagsRelations is a drizzle relations object", () => {
    expect(typeof skillsTagsRelations).toBe("object");
    expect(skillsTagsRelations).not.toBeNull();
  });

  test("snapshotsRelations is a drizzle relations object", () => {
    expect(typeof snapshotsRelations).toBe("object");
    expect(snapshotsRelations).not.toBeNull();
  });

  test("snapshotFilesRelations is a drizzle relations object", () => {
    expect(typeof snapshotFilesRelations).toBe("object");
    expect(snapshotFilesRelations).not.toBeNull();
  });

  test("reviewsRelations is a drizzle relations object", () => {
    expect(typeof reviewsRelations).toBe("object");
    expect(reviewsRelations).not.toBeNull();
  });

  test("staticAuditsRelations is a drizzle relations object", () => {
    expect(typeof staticAuditsRelations).toBe("object");
    expect(staticAuditsRelations).not.toBeNull();
  });

  test("tagsRelations is a drizzle relations object", () => {
    expect(typeof tagsRelations).toBe("object");
    expect(tagsRelations).not.toBeNull();
  });

  test("categoriesRelations is a drizzle relations object", () => {
    expect(typeof categoriesRelations).toBe("object");
    expect(categoriesRelations).not.toBeNull();
  });

  test("all relations have distinct identities", () => {
    const allRelations = [
      usersRelations,
      sessionsRelations,
      accountsRelations,
      categoriesRelations,
      reposRelations,
      skillsRelations,
      skillsTagsRelations,
      snapshotsRelations,
      snapshotFilesRelations,
      reviewsRelations,
      staticAuditsRelations,
      tagsRelations,
    ];
    // Each relation object should be a unique reference
    const uniqueSet = new Set(allRelations);
    expect(uniqueSet.size).toBe(allRelations.length);
  });
});
