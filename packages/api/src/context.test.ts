/// <reference types="bun-types" />

import { describe, expect, mock, test } from "bun:test";

const getSession = mock(() => Promise.resolve(null));
const verifyApiKey = mock(() =>
  Promise.resolve({
    error: null,
    key: {
      referenceId: "api-user-1",
    },
    valid: true,
  }),
);

mock.module("@skills-re/auth/runtime", () => ({
  createRuntimeAuth: () => ({
    api: {
      getSession,
      signOut: () => Promise.resolve(new Response()),
      verifyApiKey,
    },
  }),
}));

const { createContext } = await import("./context");

describe("createContext", () => {
  test("authenticates an x-api-key without creating a session", async () => {
    const headers = new Headers({ "x-api-key": "secret-api-key" });
    const context = {
      req: {
        raw: new Request("https://api.skills.re/skills/saved", { headers }),
      },
    };

    const result = await createContext({ context: context as never });

    expect(result.session).toBeNull();
    expect((result as { apiKey?: unknown }).apiKey).toEqual({
      userId: "api-user-1",
    });
    expect(verifyApiKey).toHaveBeenCalledWith({
      body: {
        key: "secret-api-key",
        permissions: {
          skills: ["read", "library"],
        },
      },
    });
  });
});
