/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asFeedbackId } from "@skills-re/db/utils";

import { createFeedbackService } from "./service";

describe("feedback service", () => {
  test("creates feedback for the authenticated user", async () => {
    const calls: unknown[] = [];
    const service = createFeedbackService({
      createFeedback: async (input, _database?) => {
        calls.push(input);
        return asFeedbackId("feedback-1");
      },
      getFeedbackById: async (_id, _database?) => null,
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
        title: "Bug report",
        type: "bug",
        userId: "user-1",
      },
    ]);
  });

  test("maps feedback rows into the public item shape", async () => {
    const service = createFeedbackService({
      listFeedback: async () => [
        {
          content: "Something is broken",
          createdAt: 123,
          id: asFeedbackId("feedback-1"),
          response: null,
          status: "pending",
          title: "Bug report",
          type: "bug",
          updatedAt: 123,
          userId: null,
        },
      ],
      createFeedback: async () => asFeedbackId("feedback-1"),
      getFeedbackById: async (_id, _database?) => null,
      getFeedbackByIdAndUser: async (_input, _database?) => null,
      listFeedbackByUser: async (_input, _database?) => [],
      updateFeedbackResponse: async (_input, _database?) => {},
      updateFeedbackStatus: async (_input, _database?) => {},
    });

    await expect(service.list()).resolves.toEqual([
      {
        _creationTime: 123,
        _id: asFeedbackId("feedback-1"),
        content: "Something is broken",
        response: null,
        status: "pending",
        title: "Bug report",
        type: "bug",
        userId: "",
      },
    ]);
  });

  test("updates feedback status", async () => {
    const calls: unknown[] = [];
    const service = createFeedbackService({
      updateFeedbackStatus: async (input, _database?) => {
        calls.push(input);
      },
      createFeedback: async (_input, _database?) => asFeedbackId("feedback-1"),
      getFeedbackById: async (_id, _database?) => null,
      getFeedbackByIdAndUser: async (_input, _database?) => null,
      listFeedback: async (_input, _database?) => [],
      listFeedbackByUser: async (_input, _database?) => [],
      updateFeedbackResponse: async (_input, _database?) => {},
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
