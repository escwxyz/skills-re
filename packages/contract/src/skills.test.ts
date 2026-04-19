/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  authorListItemSchema,
  searchSkillListItemSchema,
  skillBasicSchema,
  skillListItemSchema,
  skillPathSchema,
} from "./common/content";
import { skillsContract } from "./skills";

describe("skills contract", () => {
  test("accepts a public skill list item payload", () => {
    expect(
      skillListItemSchema.parse({
        description: "Widget skill",
        id: "skill-1",
        slug: "widget",
        syncTime: 123,
        title: "Widget",
      }),
    ).toEqual({
      description: "Widget skill",
      id: "skill-1",
      slug: "widget",
      syncTime: 123,
      title: "Widget",
    });
  });

  test("accepts a skill path payload", () => {
    expect(
      skillPathSchema.parse({
        authorHandle: "acme",
        repoName: "widget-repo",
        skillSlug: "widget",
      }),
    ).toEqual({
      authorHandle: "acme",
      repoName: "widget-repo",
      skillSlug: "widget",
    });
  });

  test("accepts a public author payload", () => {
    expect(
      authorListItemSchema.parse({
        avatarUrl: "https://example.com/avatar.png",
        githubUrl: "https://github.com/acme",
        handle: "acme",
        isVerified: true,
        name: "Acme",
        repoCount: 2,
        skillCount: 3,
      }),
    ).toEqual({
      avatarUrl: "https://example.com/avatar.png",
      githubUrl: "https://github.com/acme",
      handle: "acme",
      isVerified: true,
      name: "Acme",
      repoCount: 2,
      skillCount: 3,
    });
  });

  test("accepts a search skill payload", () => {
    expect(
      searchSkillListItemSchema.parse({
        description: "Widget skill",
        id: "skill-1",
        slug: "widget",
        title: "Widget",
      }),
    ).toEqual({
      description: "Widget skill",
      id: "skill-1",
      slug: "widget",
      title: "Widget",
    });
  });

  test("exposes the public skills routes used by the API layer", () => {
    expect(skillsContract.list).toBeDefined();
    expect(skillsContract.count).toBeDefined();
    expect(skillsContract.getBasic).toBeDefined();
    expect(skillsContract.resolvePathBySlug).toBeDefined();
    expect(skillsContract.getByPath).toBeDefined();
    expect(skillsContract.getSkillsHistoryInfo).toBeDefined();
    expect(skillsContract.search).toBeDefined();
    expect(skillsContract.aiSearch).toBeDefined();
    expect(skillsContract.checkExisting).toBeDefined();
    expect(skillsContract.getAuthorByHandle).toBeDefined();
    expect(skillsContract.listAuthors).toBeDefined();
  });

  test("accepts a basic skill payload", () => {
    expect(
      skillBasicSchema.parse({
        description: "Widget skill",
        title: "Widget",
      }),
    ).toEqual({
      description: "Widget skill",
      title: "Widget",
    });
  });

  test("exposes the github submit route used by the public ingestion flow", () => {
    expect(skillsContract.submitGithubRepoPublic).toBeDefined();
  });

  test("exposes the authenticated claim route used by public skill pages", () => {
    expect(skillsContract.claimAsAuthor).toBeDefined();
  });

  test("exposes the authenticated upload route used by the workflow pipeline", () => {
    expect(skillsContract.uploadSkills).toBeDefined();
  });

  test("exposes the ai search route used by the public search UI", () => {
    expect(skillsContract.aiSearch).toBeDefined();
  });

  test("exposes the snapshot-backed skill history route", () => {
    expect(skillsContract.getSkillsHistoryInfo).toBeDefined();
  });
});
