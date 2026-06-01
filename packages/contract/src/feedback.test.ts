/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { feedbackContract } from "./feedback";

describe("feedback contract", () => {
  test("exposes the expected routes", () => {
    expect(feedbackContract.create).toBeDefined();
    expect(feedbackContract.getById).toBeDefined();
    expect(feedbackContract.getMineById).toBeDefined();
    expect(feedbackContract.list).toBeDefined();
    expect(feedbackContract.listMine).toBeDefined();
    expect(feedbackContract.updateResponse).toBeDefined();
    expect(feedbackContract.updateStatus).toBeDefined();
  });

  test("accepts skill report creation input", () => {
    const inputSchema = feedbackContract.create["~orpc"].inputSchema;

    const parsed = inputSchema.safeParse({
      content: "The install instructions are outdated.",
      skillId: "skill-1",
      skillSlug: "agent-helper",
      skillTitle: "Agent Helper",
      title: "Outdated docs",
      type: "skill_issue",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      skillId: "skill-1",
      skillSlug: "agent-helper",
      skillTitle: "Agent Helper",
      type: "skill_issue",
    });
  });

  test("returns skill report context in feedback items", () => {
    const outputSchema = feedbackContract.listMine["~orpc"].outputSchema;

    const parsed = outputSchema.safeParse([
      {
        _creationTime: 123,
        _id: "feedback-1",
        content: "The author wants this removed.",
        response: null,
        skillId: "skill-1",
        skillSlug: "agent-helper",
        skillTitle: "Agent Helper",
        status: "pending",
        title: "Remove this Skill",
        type: "skill_takedown",
        userId: "user-1",
      },
    ]);

    expect(parsed.success).toBe(true);
    expect(parsed.data[0]).toMatchObject({
      skillId: "skill-1",
      skillSlug: "agent-helper",
      skillTitle: "Agent Helper",
      type: "skill_takedown",
    });
  });
});
