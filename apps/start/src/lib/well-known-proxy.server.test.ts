/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { forwardWellKnownRequest } from "./well-known-proxy.server";

describe("forwardWellKnownRequest", () => {
  test("preserves upstream status, body, and content type", async () => {
    const calls: { init?: RequestInit; url: string }[] = [];
    const response = await forwardWellKnownRequest({
      fetchFn: (input, init) => {
        calls.push({ init, url: String(input) });
        return Promise.resolve(
          new Response(JSON.stringify({ skills: [] }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          }),
        );
      },
      method: "GET",
      path: "/.well-known/agent-skills/index.json",
      serverUrl: "https://api.skills.re",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.skills.re/.well-known/agent-skills/index.json");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.text()).resolves.toBe(JSON.stringify({ skills: [] }));
  });

  test("forwards HEAD requests without reading the upstream body", async () => {
    const response = await forwardWellKnownRequest({
      fetchFn: () =>
        Promise.resolve(
          new Response("unexpected", {
            headers: {
              "Content-Length": "42",
              "Content-Type": "text/markdown; charset=utf-8",
            },
            status: 200,
          }),
        ),
      method: "HEAD",
      path: "/.well-known/agent-skills/snap_1/SKILL.md",
      serverUrl: "https://api.skills.re",
    });

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("content-length")).toBe("42");
  });

  test("propagates upstream 404 responses", async () => {
    const response = await forwardWellKnownRequest({
      fetchFn: () =>
        Promise.resolve(
          new Response("Not found", {
            headers: { "Content-Type": "text/plain" },
            status: 404,
          }),
        ),
      method: "GET",
      path: "/.well-known/agent-skills/missing/SKILL.md",
      serverUrl: "https://api.skills.re",
    });

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Not found");
  });

  test("preserves HEAD semantics even when an upstream error message is configured", async () => {
    const response = await forwardWellKnownRequest({
      fetchFn: () =>
        Promise.resolve(
          new Response("Internal upstream details", {
            headers: { "Content-Type": "text/plain" },
            status: 503,
          }),
        ),
      method: "HEAD",
      path: "/.well-known/agent-configuration",
      serverUrl: "https://api.skills.re",
      upstreamErrorMessage: "Failed to load agent configuration.",
    });

    expect(response.status).toBe(503);
    expect(response.body).toBeNull();
    expect(response.headers.get("content-type")).toContain("text/plain");
  });

  test("can replace upstream error bodies with route-specific text", async () => {
    const response = await forwardWellKnownRequest({
      fetchFn: () => Promise.resolve(new Response("Internal upstream details", { status: 503 })),
      method: "GET",
      path: "/.well-known/agent-configuration",
      serverUrl: "https://api.skills.re",
      upstreamErrorMessage: "Failed to load agent configuration.",
    });

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("text/plain");
    await expect(response.text()).resolves.toBe("Failed to load agent configuration.");
  });

  test("applies a default content type when upstream omits it", async () => {
    const response = await forwardWellKnownRequest({
      defaultContentType: "application/json",
      fetchFn: () =>
        Promise.resolve(
          new Response(JSON.stringify({ issuer: "https://api.skills.re" }), {
            status: 200,
          }),
        ),
      method: "GET",
      path: "/.well-known/openid-configuration",
      serverUrl: "https://api.skills.re",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  test("returns 504 on upstream timeout", async () => {
    const response = await forwardWellKnownRequest({
      fetchFn: (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
      method: "GET",
      path: "/.well-known/agent-skills/index.json",
      serverUrl: "https://api.skills.re",
      timeoutMs: 1,
    });

    expect(response.status).toBe(504);
    await expect(response.text()).resolves.toBe("Upstream request timed out.");
  });

  test("returns a fixed fallback message for thrown upstream errors", async () => {
    const response = await forwardWellKnownRequest({
      fetchFn: () => Promise.reject(new Error("Sensitive upstream detail")),
      method: "GET",
      path: "/.well-known/openid-configuration",
      serverUrl: "https://api.skills.re",
    });

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toContain("text/plain");
    await expect(response.text()).resolves.toBe("Failed to reach upstream.");
  });
});
