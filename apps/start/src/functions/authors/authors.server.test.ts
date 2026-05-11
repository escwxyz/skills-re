/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { fetchAuthorsPagination } from "./authors.server";

type AuthorsPaginationClient = Parameters<typeof fetchAuthorsPagination>[0]["client"];

describe("fetchAuthorsPagination", () => {
  test("forwards cursor, limit, and sort to the public authors contract", async () => {
    const calls: Array<{ cursor?: string; limit?: number; sort?: "alphabetical" | "popular" }> = [];
    const client = {
      skills: {
        listAuthors: (input?: {
          cursor?: string;
          limit?: number;
          sort?: "alphabetical" | "popular";
        }) => {
          calls.push(input ?? {});
          return Promise.resolve({
            continueCursor: "cursor-2",
            isDone: false,
            page: [
              {
                handle: "acme",
                repoCount: 2,
                skillCount: 3,
              },
            ],
          });
        },
      },
    } satisfies AuthorsPaginationClient;

    await expect(
      fetchAuthorsPagination({
        client,
        cursor: "cursor-1",
        limit: 24,
        sort: "alphabetical",
      }),
    ).resolves.toEqual({
      continueCursor: "cursor-2",
      isDone: false,
      page: [
        {
          handle: "acme",
          repoCount: 2,
          skillCount: 3,
        },
      ],
    });

    expect(calls).toEqual([
      {
        cursor: "cursor-1",
        limit: 24,
        sort: "alphabetical",
      },
    ]);
  });
});
