/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { applyCrawlerResponseHeaders } from "@/lib/crawler-response";

describe("applyCrawlerResponseHeaders", () => {
  test("adds a noindex robots header to server function responses", async () => {
    const response = applyCrawlerResponseHeaders(
      "/_serverFn/abc123",
      new Response("ok", {
        headers: {
          "Content-Type": "text/plain",
        },
        status: 200,
      }),
    );

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(response.headers.get("Content-Type")).toBe("text/plain");
    expect(await response.text()).toBe("ok");
  });

  test("leaves non-server-function responses unchanged", () => {
    const originalResponse = new Response("ok");
    const response = applyCrawlerResponseHeaders("/skills", originalResponse);

    expect(response).toBe(originalResponse);
    expect(response.headers.get("X-Robots-Tag")).toBeNull();
  });
});
