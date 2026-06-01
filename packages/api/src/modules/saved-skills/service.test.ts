/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asSavedSkillId, asSkillId } from "@skills-re/db/utils";

import { createSavedSkillsService } from "./service";

describe("saved skills service", () => {
  test("saves a skill idempotently for the authenticated user", async () => {
    const calls: unknown[] = [];
    let callCount = 0;
    const service = createSavedSkillsService({
      findSkillBySlug: () => ({
        description: "Useful automation",
        id: asSkillId("skill-1"),
        slug: "useful-automation",
        syncTime: 123,
        title: "Useful automation",
      }),
      insertSavedSkill: (input) => {
        calls.push(input);
        callCount += 1;
        return callCount === 1
          ? {
              createdAt: 123,
              id: asSavedSkillId("saved-skill-1"),
            }
          : null;
      },
      listSavedSkillsByUserId: () => ({ continueCursor: "", isDone: true, page: [] }),
    });

    await expect(
      service.save({
        slug: "useful-automation",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      alreadySaved: false,
      saved: true,
    });

    await expect(
      service.save({
        slug: "useful-automation",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      alreadySaved: true,
      saved: true,
    });

    expect(calls).toEqual([
      {
        skillId: "skill-1",
        userId: "user-1",
      },
      {
        skillId: "skill-1",
        userId: "user-1",
      },
    ]);
  });

  test("unsaving removes only the default collection membership", async () => {
    const calls: unknown[] = [];
    const service = createSavedSkillsService({
      deleteSavedSkill: (input) => {
        calls.push(input);
        return Promise.resolve();
      },
      findSkillBySlug: () => ({
        description: "Useful automation",
        id: asSkillId("skill-1"),
        slug: "useful-automation",
        syncTime: 123,
        title: "Useful automation",
      }),
      insertSavedSkill: () => null,
      listSavedSkillsByUserId: () => ({ continueCursor: "", isDone: true, page: [] }),
    });

    await expect(
      service.unsave({
        slug: "useful-automation",
        userId: "user-1",
      }),
    ).resolves.toEqual({ unsaved: true });

    expect(calls).toEqual([
      {
        skillId: "skill-1",
        userId: "user-1",
      },
    ]);
  });

  test("lists saved skills sorted by save time", async () => {
    const service = createSavedSkillsService({
      findSkillBySlug: () => null,
      insertSavedSkill: () => null,
      listSavedSkillsByUserId: () => ({
        continueCursor: "",
        isDone: true,
        page: [
          {
            authorHandle: "ada",
            createdAt: 111,
            description: "First one",
            id: "skill-1",
            latestVersion: "v1.0.0",
            repoName: "first-repo",
            slug: "first-skill",
            title: "First skill",
            updatedAt: 222,
          },
        ],
      }),
    });

    await expect(
      service.listMine({
        limit: 20,
        userId: "user-1",
      }),
    ).resolves.toEqual({
      continueCursor: "",
      isDone: true,
      page: [
        {
          authorHandle: "ada",
          createdAt: 111,
          description: "First one",
          id: "skill-1",
          latestVersion: "v1.0.0",
          repoName: "first-repo",
          slug: "first-skill",
          title: "First skill",
          updatedAt: 222,
        },
      ],
    });
  });
});
