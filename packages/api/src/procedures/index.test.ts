/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import type { Context } from "../types";
import * as procedures from "./index";

describe("API user authorization", () => {
  test("uses the verified API-key owner without inventing a session user", () => {
    const context = {
      apiKey: { userId: "api-user-1" },
      auth: null,
      session: null,
    } satisfies Context;
    const resolveApiUser = (
      procedures as typeof procedures & {
        resolveApiUser?: (input: Context) => { id: string; isAdmin: boolean } | null;
      }
    ).resolveApiUser;

    expect(resolveApiUser?.(context)).toEqual({
      id: "api-user-1",
      isAdmin: false,
    });
  });
});
