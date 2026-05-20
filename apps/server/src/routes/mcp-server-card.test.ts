import { describe, expect, test } from "bun:test";
import { Hono } from "hono";

import { createMcpServerCard, setMcpServerCardHeaders } from "./mcp-server-card";

describe("MCP server card discovery", () => {
  test("serves the server card at the well-known path", async () => {
    const route = new Hono<{ Bindings: Env }>();
    route.get("/.well-known/mcp/server-card.json", (c) => {
      setMcpServerCardHeaders(c.res.headers);
      return c.json(createMcpServerCard(c.env.PUBLIC_SERVER_URL));
    });

    const response = await route.fetch(
      new Request("https://api.skills.re/.well-known/mcp/server-card.json"),
      {
        PUBLIC_SERVER_URL: "https://api.skills.re",
        PUBLIC_SITE_URL: "https://skills.re",
      } as Env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    await expect(response.json()).resolves.toMatchObject({
      serverInfo: {
        name: "skills-re",
        version: "1.0.0",
      },
      transport: {
        endpoint: "https://api.skills.re/mcp",
      },
    });
  });

  test("describes the Skills.re remote MCP transport and capabilities", () => {
    expect(createMcpServerCard("https://api.skills.re")).toMatchObject({
      capabilities: {
        prompts: false,
        resources: false,
        tools: true,
      },
      remotes: [
        {
          type: "streamable-http",
          url: "https://api.skills.re/mcp",
        },
      ],
      serverInfo: {
        name: "skills-re",
        version: "1.0.0",
      },
      transport: {
        endpoint: "https://api.skills.re/mcp",
        type: "streamable-http",
      },
    });
  });

  test("lists the currently registered remote MCP tools in metadata", () => {
    const card = createMcpServerCard("https://api.skills.re");

    expect(card._meta.tools).toContain("search_skills");
    expect(card._meta.tools).toContain("get_skill");
    expect(card._meta.tools).toContain("get_skill_recommendations");
  });

  test("sets public discovery cache and CORS headers", () => {
    const headers = new Headers();

    setMcpServerCardHeaders(headers);

    expect(headers.get("access-control-allow-origin")).toBe("*");
    expect(headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
    expect(headers.get("access-control-allow-headers")).toBe("Content-Type");
    expect(headers.get("cache-control")).toBe("public, max-age=3600");
  });
});
