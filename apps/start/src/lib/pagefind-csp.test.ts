/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

describe("Pagefind CSP compatibility", () => {
  test("scopes Pagefind CSP compatibility to localized skills index pages", async () => {
    const module = await import("./pagefind-csp");

    expect(module.isPagefindSearchPathname?.("/skills")).toBe(true);
    expect(module.isPagefindSearchPathname?.("/skills/")).toBe(true);
    expect(module.isPagefindSearchPathname?.("/de/skills")).toBe(true);
    expect(module.isPagefindSearchPathname?.("/zh-Hans/skills")).toBe(true);
    expect(module.isPagefindSearchPathname?.("/")).toBe(false);
    expect(module.isPagefindSearchPathname?.("/skills/example-skill")).toBe(false);
    expect(module.isPagefindSearchPathname?.("/docs")).toBe(false);
  });

  test("augments existing script and worker directives without creating a new policy", async () => {
    const module = (await import("./pagefind-csp").catch(() => ({}))) as {
      applyPagefindCspCompatibility?: (response: Response) => Response;
    };
    const secured = new Response("ok", {
      headers: {
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; worker-src 'self'",
      },
    });
    const unrestricted = new Response("ok");

    expect(
      module.applyPagefindCspCompatibility?.(secured).headers.get("content-security-policy"),
    ).toContain("'wasm-unsafe-eval'");
    expect(
      module.applyPagefindCspCompatibility?.(secured).headers.get("content-security-policy"),
    ).toContain("blob:");
    expect(
      module.applyPagefindCspCompatibility?.(unrestricted).headers.get("content-security-policy"),
    ).toBeNull();
  });

  test("does not grant self when creating missing directives", async () => {
    const module = await import("./pagefind-csp");
    const response = new Response("ok", {
      headers: {
        "Content-Security-Policy": "default-src 'none'",
      },
    });

    expect(
      module.applyPagefindCspCompatibility(response).headers.get("content-security-policy"),
    ).toBe("default-src 'none'; script-src 'wasm-unsafe-eval'; worker-src blob:");
  });

  test("returns a new response instead of mutating secured response headers", async () => {
    const module = await import("./pagefind-csp");
    const originalPolicy = "default-src 'self'";
    const response = new Response("ok", {
      headers: {
        "Content-Security-Policy": originalPolicy,
        "X-Test": "preserved",
      },
      status: 202,
      statusText: "Accepted",
    });

    const compatibleResponse = module.applyPagefindCspCompatibility(response);

    expect(compatibleResponse).not.toBe(response);
    expect(response.headers.get("content-security-policy")).toBe(originalPolicy);
    expect(compatibleResponse.headers.get("x-test")).toBe("preserved");
    expect(compatibleResponse.status).toBe(202);
    expect(compatibleResponse.statusText).toBe("Accepted");
    expect(await compatibleResponse.text()).toBe("ok");
  });
});
