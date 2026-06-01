import { describe, expect, mock, test } from "bun:test";
import { call } from "@orpc/server";

import type { Context } from "../types";
import { appRouter } from "./index";

const mockContext = (overrides: Partial<Context> = {}): Context => ({
  auth: null,
  session: {
    session: { expiresAt: new Date(Date.now() + 3_600_000), id: "s1", userId: "u1" },
    user: { id: "u1" },
  },
  ...overrides,
});

describe("cli.auth.revoke", () => {
  test("calls context.revokeSession and returns { revoked: true }", async () => {
    const revokeSession = mock(() => Promise.resolve());
    const result = await call(appRouter.cli.auth.revoke, undefined, {
      context: mockContext({ revokeSession }),
    });
    expect(revokeSession).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ revoked: true });
  });
});
