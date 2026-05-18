import { describe, expect, test } from "bun:test";

import { asSkillId, asSkillUsageEventId, asUserId } from "@skills-re/db/utils";

import { createSkillUsageService } from "./service";

const skill = {
  authorHandle: "acme",
  createdAt: 1,
  description: "Demo skill",
  downloadsAllTime: 0,
  downloadsTrending: 0,
  forkCount: 0,
  id: asSkillId("skill-1"),
  isVerified: true,
  latestVersion: "1.0.0",
  license: null,
  ownerAvatarUrl: null,
  primaryCategory: null,
  repoName: "skills",
  repoUrl: "https://github.com/acme/skills",
  slug: "demo",
  stargazerCount: 0,
  syncTime: 1,
  tags: [],
  title: "Demo",
  updatedAt: 1,
  viewsAllTime: 0,
};

describe("skill usage service", () => {
  test("records sanitized usage for the authenticated user", async () => {
    const calls: unknown[] = [];
    const service = createSkillUsageService({
      findSkillBySlug: async () => skill,
      insertSkillUsageEvent: async (input) => {
        calls.push(input);
        return { id: asSkillUsageEventId("usage-1"), usedAt: 123 };
      },
      listMineSavedSkills: async () => ({ continueCursor: "", isDone: true, page: [] }),
      listSkillUsageEventsByUserId: async () => [],
    });

    await expect(
      service.record({
        agentName: "codex",
        projectContext: "Opened /Users/ada/project/src/index.ts",
        skillSlug: " demo ",
        taskDescription: "Write tests",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      id: asSkillUsageEventId("usage-1"),
      recorded: true,
      skillFound: true,
      usedAt: 123,
    });

    expect(calls).toEqual([
      {
        agentName: "codex",
        projectContext: "Opened /Users/[redacted]/project/src/index.ts",
        skillId: "skill-1",
        skillPath: undefined,
        skillSlug: "demo",
        taskDescription: "Write tests",
        userId: "user-1",
      },
    ]);
  });

  test("lists recent usage without crossing users", async () => {
    const service = createSkillUsageService({
      findSkillBySlug: async () => null,
      insertSkillUsageEvent: async () => ({ id: asSkillUsageEventId("usage-1"), usedAt: 123 }),
      listMineSavedSkills: async () => ({ continueCursor: "", isDone: true, page: [] }),
      listSkillUsageEventsByUserId: async (input) => {
        expect(input.userId).toBe(asUserId("user-1"));
        return [
          {
            agentName: "codex",
            authorHandle: "acme",
            id: asSkillUsageEventId("usage-1"),
            projectContext: null,
            repoName: "skills",
            skillId: asSkillId("skill-1"),
            skillPath: null,
            skillSlug: "demo",
            taskDescription: "Write tests",
            title: "Demo",
            usedAt: 123,
          },
        ];
      },
    });

    expect(service.listRecent({ userId: "user-1" })).resolves.toEqual({
      page: [
        {
          agentName: "codex",
          authorHandle: "acme",
          id: asSkillUsageEventId("usage-1"),
          projectContext: undefined,
          repoName: "skills",
          skillId: asSkillId("skill-1"),
          skillPath: undefined,
          skillSlug: "demo",
          taskDescription: "Write tests",
          title: "Demo",
          usedAt: 123,
        },
      ],
    });
  });

  test("builds recommendation output from saved and recent skills", async () => {
    const service = createSkillUsageService({
      findSkillBySlug: async () => null,
      insertSkillUsageEvent: async () => ({ id: asSkillUsageEventId("usage-1"), usedAt: 123 }),
      listMineSavedSkills: async () => ({
        continueCursor: "",
        isDone: true,
        page: [
          {
            authorHandle: "acme",
            createdAt: 1,
            description: "Saved skill",
            id: "skill-1",
            latestVersion: "1.0.0",
            repoName: "skills",
            slug: "saved",
            title: "Saved",
            updatedAt: 2,
          },
        ],
      }),
      listSkillUsageEventsByUserId: async () => [
        {
          agentName: null,
          authorHandle: "acme",
          id: asSkillUsageEventId("usage-1"),
          projectContext: null,
          repoName: "skills",
          skillId: asSkillId("skill-2"),
          skillPath: null,
          skillSlug: "recent",
          taskDescription: null,
          title: "Recent",
          usedAt: 123,
        },
      ],
    });

    const result = await service.recommend({
      taskDescription: "Need testing help",
      userId: "user-1",
    });
    expect(result.page.map((entry) => entry.skill.slug)).toEqual(["saved", "recent"]);
    expect(result.page[0]?.reason).toContain("Saved");
  });
});
