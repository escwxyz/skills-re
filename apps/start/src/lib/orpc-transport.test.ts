/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { fetchBrowserORPCRequest, fetchServerORPCRequest } from "./orpc-transport";

describe("orpc transport", () => {
  test("browser transport keeps credentialed public fetches", async () => {
    const calls: Array<{ init?: RequestInit; url: string }> = [];

    const response = await fetchBrowserORPCRequest(
      "https://api.example.com/rpc/skills/search",
      {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
      (input, init) => {
        calls.push({ init, url: String(input) });
        return Promise.resolve(new Response("ok"));
      },
    );

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.example.com/rpc/skills/search");
    expect(calls[0]?.init?.credentials).toBe("include");
    expect(new Headers(calls[0]?.init?.headers).get("content-type")).toBe("application/json");
  });

  test("server transport uses the service binding and forwards auth headers", async () => {
    const serviceBindingCalls: Request[] = [];
    const fallbackCalls: Request[] = [];

    const response = await fetchServerORPCRequest({
      incomingHeaders: new Headers({
        authorization: "Bearer token-a",
        cookie: "session=abc",
      }),
      init: {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
      input: "https://start.example.com/rpc/skills/search",
      fetchFn: (input) => {
        fallbackCalls.push(input as Request);
        return Promise.resolve(new Response("fallback"));
      },
      serviceBinding: {
        fetch: (input) => {
          serviceBindingCalls.push(input as Request);
          return Promise.resolve(new Response("bound"));
        },
      },
    });

    expect(response.status).toBe(200);
    expect(serviceBindingCalls).toHaveLength(1);
    expect(fallbackCalls).toHaveLength(0);

    const request = serviceBindingCalls[0];
    expect(request?.url).toBe("https://start.example.com/rpc/skills/search");
    expect(request?.method).toBe("POST");
    expect(request?.credentials).toBe("include");
    expect(request?.headers.get("authorization")).toBe("Bearer token-a");
    expect(request?.headers.get("cookie")).toBe("session=abc");
    expect(request?.headers.get("content-type")).toBe("application/json");
  });

  test("server transport falls back to public fetch when no service binding is available", async () => {
    const fallbackCalls: Request[] = [];

    const response = await fetchServerORPCRequest({
      incomingHeaders: new Headers({
        cookie: "session=abc",
      }),
      init: {
        method: "GET",
      },
      input: "https://api.example.com/rpc/skills/list",
      fetchFn: (input) => {
        fallbackCalls.push(input as Request);
        return Promise.resolve(new Response("fallback"));
      },
    });

    expect(response.status).toBe(200);
    expect(fallbackCalls).toHaveLength(1);
    expect(fallbackCalls[0]?.headers.get("cookie")).toBe("session=abc");
    expect(fallbackCalls[0]?.credentials).toBe("include");
  });
});
