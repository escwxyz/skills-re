/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { fetchBackendJson, fetchBackendResponse } from "./backend-api.server";

describe("backend-api", () => {
  test("forwards request headers and parses json", async () => {
    const originalFetch = globalThis.fetch;
    const calls: { init?: RequestInit; url: string }[] = [];

    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        init,
        url: String(input),
      });
      return Response.json({ ok: true });
    }) as unknown as typeof fetch;

    try {
      const result = await fetchBackendJson<{ ok: boolean }>({
        backendOrigin: "https://api.example.com",
        path: "/skills/skill-1/metrics",
        requestHeaders: new Headers({
          authorization: "Bearer token-a",
          cookie: "session=abc",
        }),
      });

      expect(result).toEqual({ ok: true });
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe("https://api.example.com/skills/skill-1/metrics");

      const forwardedHeaders = new Headers(calls[0]?.init?.headers);
      expect(forwardedHeaders.get("authorization")).toBe("Bearer token-a");
      expect(forwardedHeaders.get("cookie")).toBe("session=abc");
      expect(calls[0]?.init?.credentials).toBe("include");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends post bodies to backend", async () => {
    const originalFetch = globalThis.fetch;
    const calls: { init?: RequestInit; url: string }[] = [];

    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        init,
        url: String(input),
      });
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;

    try {
      const response = await fetchBackendResponse({
        backendOrigin: "https://api.example.com",
        init: {
          body: JSON.stringify({ path: "/skills/acme/widget" }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
        path: "/skills/skill-1/view",
      });

      expect(response.status).toBe(200);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe("https://api.example.com/skills/skill-1/view");
      expect(calls[0]?.init?.method).toBe("POST");
      expect(calls[0]?.init?.body).toBe(JSON.stringify({ path: "/skills/acme/widget" }));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
