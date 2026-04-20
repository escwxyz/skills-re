/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { asFeedbackId, asUserId } from "@skills-re/db/utils";

import {
  createFeedback,
  getFeedbackById,
  getFeedbackByIdAndUser,
  listFeedback,
  updateFeedbackResponse,
  updateFeedbackStatus,
} from "./repo";

describe("feedback repo", () => {
  test("creates feedback with pending status and timestamps", async () => {
    const inserted: unknown[] = [];
    const database = {
      insert: () => ({
        values: (value: unknown) => {
          inserted.push(value);
          return {
            returning: () => [{ id: asFeedbackId("feedback-1") }],
          };
        },
      }),
    };

    const now = 1_700_000_000_000;
    const originalNow = Date.now;
    Date.now = () => now;
    try {
      await expect(
        createFeedback(
          {
            content: "Something is broken",
            title: "Bug report",
            type: "bug",
            userId: asUserId("user-1"),
          },
          database as never,
        ),
      ).resolves.toEqual(asFeedbackId("feedback-1"));
    } finally {
      Date.now = originalNow;
    }

    expect(inserted[0]).toMatchObject({
      content: "Something is broken",
      createdAt: now,
      response: null,
      status: "pending",
      title: "Bug report",
      type: "bug",
      updatedAt: now,
      userId: "user-1",
    });
  });

  test("lists feedback with a status filter", async () => {
    const calls: unknown[] = [];
    const database = {
      select: () => ({
        from: () => ({
          where: (value: unknown) => {
            calls.push(value);
            return {
              orderBy: () => ({
                limit: () =>
                  Promise.resolve([
                    {
                      content: "Something is broken",
                      createdAt: 1,
                      id: asFeedbackId("feedback-1"),
                      response: null,
                      status: "resolved" as const,
                      title: "Bug report",
                      type: "bug" as const,
                      updatedAt: 1,
                      userId: asUserId("user-1"),
                    },
                  ]),
              }),
            };
          },
        }),
      }),
    };

    await expect(
      listFeedback(
        {
          limit: 25,
          status: "resolved",
        },
        database as never,
      ),
    ).resolves.toEqual([
      {
        content: "Something is broken",
        createdAt: 1,
        id: asFeedbackId("feedback-1"),
        response: null,
        status: "resolved",
        title: "Bug report",
        type: "bug",
        updatedAt: 1,
        userId: asUserId("user-1"),
      },
    ]);
    expect(calls).toHaveLength(1);
  });

  test("reads a feedback row by id and by user", async () => {
    const row = {
      content: "Something is broken",
      createdAt: 1,
      id: asFeedbackId("feedback-1"),
      response: null,
      status: "pending" as const,
      title: "Bug report",
      type: "bug" as const,
      updatedAt: 1,
      userId: asUserId("user-1"),
    };
    const database = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([row]),
          }),
        }),
      }),
    };

    await expect(getFeedbackById(asFeedbackId("feedback-1"), database as never)).resolves.toEqual(
      row,
    );
    await expect(
      getFeedbackByIdAndUser(
        {
          id: asFeedbackId("feedback-1"),
          userId: asUserId("user-1"),
        },
        database as never,
      ),
    ).resolves.toEqual(row);
  });

  test("updates feedback status and response", async () => {
    const updates: unknown[] = [];
    const database = {
      update: () => ({
        set: (value: unknown) => ({
          where: (value2: unknown) => {
            updates.push({ set: value, where: value2 });
            return Promise.resolve();
          },
        }),
      }),
    };

    await updateFeedbackStatus(
      {
        id: asFeedbackId("feedback-1"),
        status: "resolved",
      },
      database as never,
    );
    await updateFeedbackResponse(
      {
        id: asFeedbackId("feedback-1"),
        response: "Thanks",
      },
      database as never,
    );

    expect(updates).toHaveLength(2);
  });
});
