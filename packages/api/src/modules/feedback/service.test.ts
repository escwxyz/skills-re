/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asFeedbackId, asSkillId } from "@skills-re/db/utils";

import { createFeedbackService } from "./service";

describe("feedback service", () => {
  test("creates feedback for the authenticated user", async () => {
    const calls: unknown[] = [];
    const service = createFeedbackService({
      createFeedback: (input, _database?) => {
        calls.push(input);
        return asFeedbackId("feedback-1");
      },
      findSkillById: () => null,
      getFeedbackById: (_id, _database?) => null,
    });

    await expect(
      service.create({
        content: "Something is broken",
        title: "Bug report",
        type: "bug",
        userId: "user-1",
      }),
    ).resolves.toEqual({ id: asFeedbackId("feedback-1") });
    expect(calls).toEqual([
      {
        content: "Something is broken",
        skillId: null,
        skillSlug: null,
        skillTitle: null,
        title: "Bug report",
        type: "bug",
        userId: "user-1",
      },
    ]);
  });

  test("creates anonymous non-takedown skill reports with skill context", async () => {
    const calls: unknown[] = [];
    const service = createFeedbackService({
      createFeedback: (input, _database?) => {
        calls.push(input);
        return asFeedbackId("feedback-1");
      },
      findSkillById: () => ({
        authorHandle: "owner",
        createdAt: 0,
        description: "desc",
        downloadsAllTime: 0,
        downloadsTrending: 0,
        forkCount: 0,
        id: asSkillId("skill-1"),
        isVerified: false,
        latestVersion: null,
        license: null,
        ownerAvatarUrl: null,
        primaryCategory: null,
        repoName: "repo",
        repoUrl: "https://github.com/owner/repo",
        slug: "canonical-slug",
        stargazerCount: 0,
        syncTime: 0,
        tags: [],
        title: "Canonical Title",
        updatedAt: 0,
        viewsAllTime: 0,
      }),
      getFeedbackById: (_id, _database?) => null,
    });

    await expect(
      service.create({
        content: "The Skill page has broken metadata",
        skillId: "skill-1",
        skillSlug: "agent-helper",
        skillTitle: "Agent Helper",
        title: "Display issue",
        type: "skill_display",
        userId: null,
      }),
    ).resolves.toEqual({ id: asFeedbackId("feedback-1") });
    expect(calls).toEqual([
      {
        content: "The Skill page has broken metadata",
        skillId: asSkillId("skill-1"),
        skillSlug: "canonical-slug",
        skillTitle: "Canonical Title",
        title: "Display issue",
        type: "skill_display",
        userId: null,
      },
    ]);
  });

  test("rejects takedown reports unless submitted by the claimed author", async () => {
    const calls: unknown[] = [];
    const service = createFeedbackService({
      createFeedback: (input, _database?) => {
        calls.push(input);
        return asFeedbackId("feedback-1");
      },
      findSkillById: () => ({
        authorHandle: "owner",
        createdAt: 0,
        description: "desc",
        downloadsAllTime: 0,
        downloadsTrending: 0,
        forkCount: 0,
        id: asSkillId("skill-1"),
        isVerified: false,
        latestVersion: null,
        license: null,
        ownerAvatarUrl: null,
        primaryCategory: null,
        repoName: "repo",
        repoUrl: "https://github.com/owner/repo",
        slug: "canonical-slug",
        stargazerCount: 0,
        syncTime: 0,
        tags: [],
        title: "Canonical Title",
        updatedAt: 0,
        viewsAllTime: 0,
      }),
      findSkillClaimContextById: () => ({
        claimedUserId: "user-2",
        repoOwnerHandle: "owner",
        skillId: "skill-1",
      }),
      getFeedbackById: (_id, _database?) => null,
    });

    await expect(
      service.create({
        content: "I own this repo and want the Skill removed.",
        skillId: "skill-1",
        skillSlug: "agent-helper",
        skillTitle: "Agent Helper",
        title: "Remove this Skill",
        type: "skill_takedown",
        userId: "user-1",
      }),
    ).rejects.toThrow("Only the claimed author can request Skill removal.");
    expect(calls).toEqual([]);
  });

  test("creates takedown reports for the claimed author", async () => {
    const calls: unknown[] = [];
    const service = createFeedbackService({
      createFeedback: (input, _database?) => {
        calls.push(input);
        return asFeedbackId("feedback-1");
      },
      findSkillById: () => ({
        authorHandle: "owner",
        createdAt: 0,
        description: "desc",
        downloadsAllTime: 0,
        downloadsTrending: 0,
        forkCount: 0,
        id: asSkillId("skill-1"),
        isVerified: false,
        latestVersion: null,
        license: null,
        ownerAvatarUrl: null,
        primaryCategory: null,
        repoName: "repo",
        repoUrl: "https://github.com/owner/repo",
        slug: "canonical-slug",
        stargazerCount: 0,
        syncTime: 0,
        tags: [],
        title: "Canonical Title",
        updatedAt: 0,
        viewsAllTime: 0,
      }),
      findSkillClaimContextById: () => ({
        claimedUserId: "user-1",
        repoOwnerHandle: "owner",
        skillId: "skill-1",
      }),
      getFeedbackById: (_id, _database?) => null,
    });

    await expect(
      service.create({
        content: "I own this repo and want the Skill removed.",
        skillId: "skill-1",
        skillSlug: "agent-helper",
        skillTitle: "Agent Helper",
        title: "Remove this Skill",
        type: "skill_takedown",
        userId: "user-1",
      }),
    ).resolves.toEqual({ id: asFeedbackId("feedback-1") });
    expect(calls).toHaveLength(1);
  });

  test("rejects skill reports without a skill id", async () => {
    const service = createFeedbackService({
      createFeedback: () => asFeedbackId("feedback-1"),
      findSkillById: () => null,
      getFeedbackById: (_id, _database?) => null,
    });

    await expect(
      service.create({
        content: "Missing skill id",
        title: "Display issue",
        type: "skill_issue",
        userId: null,
      }),
    ).rejects.toThrow("Skill report requires a skill id.");
  });

  test("maps feedback rows into the public item shape", async () => {
    const service = createFeedbackService({
      listFeedback: () => [
        {
          content: "Something is broken",
          createdAt: 123,
          id: asFeedbackId("feedback-1"),
          response: null,
          skillId: asSkillId("skill-1"),
          skillSlug: "agent-helper",
          skillTitle: "Agent Helper",
          status: "pending",
          title: "Bug report",
          type: "skill_issue",
          updatedAt: 123,
          userId: null,
        },
      ],
      createFeedback: () => asFeedbackId("feedback-1"),
      getFeedbackById: (_id, _database?) => null,
      getFeedbackByIdAndUser: (_input, _database?) => null,
      listFeedbackByUser: (_input, _database?) => [],
      updateFeedbackResponse: (_input, _database?) => {},
      updateFeedbackStatus: (_input, _database?) => {},
    });

    await expect(service.list()).resolves.toEqual([
      {
        _creationTime: 123,
        _id: asFeedbackId("feedback-1"),
        content: "Something is broken",
        response: null,
        skillId: asSkillId("skill-1"),
        skillSlug: "agent-helper",
        skillTitle: "Agent Helper",
        status: "pending",
        title: "Bug report",
        type: "skill_issue",
        userId: "",
      },
    ]);
  });

  test("updates feedback status", async () => {
    const calls: unknown[] = [];
    const service = createFeedbackService({
      updateFeedbackStatus: (input, _database?) => {
        calls.push(input);
      },
      createFeedback: (_input, _database?) => asFeedbackId("feedback-1"),
      getFeedbackById: (_id, _database?) => null,
      getFeedbackByIdAndUser: (_input, _database?) => null,
      listFeedback: (_input, _database?) => [],
      listFeedbackByUser: (_input, _database?) => [],
      updateFeedbackResponse: (_input, _database?) => {},
    });

    await expect(
      service.updateStatus({
        id: asFeedbackId("feedback-1"),
        status: "resolved",
      }),
    ).resolves.toBeNull();
    expect(calls).toEqual([
      {
        id: asFeedbackId("feedback-1"),
        status: "resolved",
      },
    ]);
  });
});
