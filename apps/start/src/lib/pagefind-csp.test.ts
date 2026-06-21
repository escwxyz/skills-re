/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

describe("Pagefind CSP compatibility", () => {
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
});
