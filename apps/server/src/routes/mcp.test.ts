import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { asSkillUsageEventId } from "@skills-re/db/utils";
import { describe, expect, test } from "bun:test";
import { Hono } from "hono";

import type { McpRouteDeps } from "./mcp";
import { REMOTE_MCP_TOOL_NAMES, createMcpRouter } from "./mcp";

const env = {
  PUBLIC_SERVER_URL: "https://api.example.com",
} as Env;

const createSession = (userId = "user-1") => ({
  session: {
    expiresAt: "2030-01-01T00:00:00.000Z",
    id: "session-1",
    userId,
  },
  user: {
    id: userId,
    name: "Ada",
  },
});

type SkillDetail = NonNullable<Awaited<ReturnType<McpRouteDeps["getSkillByPath"]>>>;
type SavedSkillsPage = Awaited<ReturnType<McpRouteDeps["listMineSavedSkills"]>>;
type RecentUsagePage = Awaited<ReturnType<McpRouteDeps["listMyRecentSkillUsage"]>>;

const makeSkill = (overrides: Partial<SkillDetail> = {}): SkillDetail => ({
  author: {
    avatarUrl: undefined,
    githubUrl: "https://github.com/acme",
    handle: "acme",
  },
  authorHandle: "acme",
  createdAt: 1,
  description: "Demo skill",
  downloadsAllTime: 0,
  downloadsTrending: 0,
  forkCount: 0,
  id: "skill-1",
  isVerified: false,
  latestSnapshotId: undefined,
  latestVersion: "1.0.0",
  license: undefined,
  primaryCategory: undefined,
  repoName: "skills",
  repoUrl: undefined,
  slug: "demo",
  stargazerCount: 0,
  syncTime: 1,
  tags: undefined,
  title: "Demo",
  updatedAt: 2,
  viewsAllTime: 0,
  ...overrides,
});

const textContent = (result: unknown) => {
  const content = (result as { content?: unknown }).content as
    | { text?: string; type?: string }[]
    | undefined;
  return content?.[0]?.type === "text" ? (content[0].text ?? "") : "{}";
};

const createDeps = (authed = false): Partial<McpRouteDeps> => ({
  getSkillByPath: async (input) =>
    input.skillSlug === "missing"
      ? null
      : makeSkill({
          authorHandle: input.authorHandle,
          repoName: input.repoName ?? "skills",
          slug: input.skillSlug,
        }),
  getSkillRecommendations: async () => ({
    page: [
      {
        reason: "Saved in your Skills.re library.",
        skill: makeSkill(),
      },
    ],
    query: "testing",
  }),
  listMineSavedSkills: async ({ userId }): Promise<SavedSkillsPage> => ({
    continueCursor: "",
    isDone: true,
    page: [
      {
        authorHandle: undefined,
        createdAt: 1,
        description: "Saved skill",
        id: "skill-1",
        latestVersion: undefined,
        repoName: undefined,
        slug: `saved-${userId}`,
        title: "Saved",
        updatedAt: 2,
      },
    ],
  }),
  listMyRecentSkillUsage: async ({ userId }): Promise<RecentUsagePage> => ({
    page: [
      {
        agentName: undefined,
        authorHandle: undefined,
        id: asSkillUsageEventId("usage-1"),
        projectContext: undefined,
        repoName: undefined,
        skillId: undefined,
        skillPath: undefined,
        skillSlug: "demo",
        taskDescription: `task-${userId}`,
        title: undefined,
        usedAt: 1,
      },
    ],
  }),
  recordSkillUsage: async ({ skillSlug }) => ({
    id: asSkillUsageEventId("usage-1"),
    recorded: true,
    skillFound: skillSlug === "demo",
    usedAt: 1,
  }),
  resolveAuthSession: async ({ headers }) => {
    if (headers.get("authorization") === "Bearer invalid") {
      return { error: "invalid-token", session: null };
    }
    return { session: authed ? createSession() : null };
  },
  saveSkill: async ({ slug }) => ({ alreadySaved: false, saved: slug.length > 0 }),
  searchSkills: async () => ({
    continueCursor: "",
    isDone: true,
    page: [makeSkill()],
  }),
  unsaveSkill: async () => ({ unsaved: true }),
});

const connectClient = async (deps: Partial<McpRouteDeps>, headers?: HeadersInit) => {
  const app = new Hono<{ Bindings: Env }>().route("/mcp", createMcpRouter(deps));
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL("https://api.example.com/mcp"), {
    fetch: async (input, init) => {
      const request =
        input instanceof Request ? new Request(input, init) : new Request(input.toString(), init);
      return await app.fetch(request, env);
    },
    requestInit: headers ? { headers } : undefined,
  });
  await client.connect(transport);
  return { client, transport };
};

describe("remote MCP route", () => {
  test("lists public and authenticated tool names", async () => {
    const { client, transport } = await connectClient(createDeps(false));

    const result = await client.listTools();

    expect(result.tools.map((tool) => tool.name).sort()).toEqual([...REMOTE_MCP_TOOL_NAMES].sort());
    await transport.close();
  });

  test("supports exact /mcp middleware before tool handling", async () => {
    let middlewareHits = 0;
    const app = new Hono<{ Bindings: Env }>();
    app.use("/mcp", async (_c, next) => {
      middlewareHits += 1;
      await next();
    });
    app.route("/mcp", createMcpRouter(createDeps(false)));
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL("https://api.example.com/mcp"), {
      fetch: async (input, init) => {
        const request =
          input instanceof Request ? new Request(input, init) : new Request(input.toString(), init);
        return await app.fetch(request, env);
      },
    });

    await client.connect(transport);
    await client.listTools();

    expect(middlewareHits).toBeGreaterThan(0);
    await transport.close();
  });

  test("serves public search and skill metadata tools without authentication", async () => {
    const { client, transport } = await connectClient(createDeps(false));

    const search = await client.callTool({
      arguments: { query: "demo" },
      name: "search_skills",
    });
    const detail = await client.callTool({
      arguments: { authorHandle: "acme", repoName: "skills", skillSlug: "demo" },
      name: "get_skill",
    });
    const missing = await client.callTool({
      arguments: { authorHandle: "acme", skillSlug: "missing" },
      name: "get_skill",
    });

    expect(JSON.parse(textContent(search))).toMatchObject({
      page: [{ slug: "demo" }],
    });
    expect(JSON.parse(textContent(detail))).toMatchObject({
      slug: "demo",
    });
    expect(missing.isError).toBe(true);
    await transport.close();
  });

  test("fails authenticated tools closed without authentication", async () => {
    const { client, transport } = await connectClient(createDeps(false));

    const result = await client.callTool({
      arguments: { slug: "demo" },
      name: "save_skill",
    });

    expect(result.isError).toBe(true);
    expect(textContent(result)).toContain("Authentication required");
    await transport.close();
  });

  test("runs user library, usage, and recommendation tools with authentication", async () => {
    const { client, transport } = await connectClient(createDeps(true), {
      authorization: "Bearer valid",
    });

    const saved = await client.callTool({ arguments: {}, name: "get_my_saved_skills" });
    const save = await client.callTool({ arguments: { slug: "demo" }, name: "save_skill" });
    const unsave = await client.callTool({ arguments: { slug: "demo" }, name: "unsave_skill" });
    const usage = await client.callTool({
      arguments: { skillSlug: "demo", taskDescription: "testing" },
      name: "record_skill_usage",
    });
    const recommendations = await client.callTool({
      arguments: { taskDescription: "testing" },
      name: "get_skill_recommendations",
    });

    expect(JSON.parse(textContent(saved))).toMatchObject({
      page: [{ slug: "saved-user-1" }],
    });
    expect(JSON.parse(textContent(save))).toMatchObject({ saved: true });
    expect(JSON.parse(textContent(unsave))).toMatchObject({ unsaved: true });
    expect(JSON.parse(textContent(usage))).toMatchObject({
      recorded: true,
    });
    expect(JSON.parse(textContent(recommendations))).toMatchObject({
      page: [{ reason: "Saved in your Skills.re library." }],
    });
    await transport.close();
  });

  test("maps saved-skill service errors to MCP error responses", async () => {
    const { client, transport } = await connectClient(
      {
        ...createDeps(true),
        saveSkill: async () => {
          throw new Error("Skill not found.");
        },
      },
      { authorization: "Bearer valid" },
    );

    const result = await client.callTool({
      arguments: { slug: "missing" },
      name: "save_skill",
    });

    expect(result.isError).toBe(true);
    expect(textContent(result)).toContain("Skill not found.");
    await transport.close();
  });

  test("rejects invalid bearer tokens before tool execution", async () => {
    const app = new Hono<{ Bindings: Env }>().route("/mcp", createMcpRouter(createDeps(false)));

    const response = await app.fetch(
      new Request("https://api.example.com/mcp", {
        headers: { authorization: "Bearer invalid" },
        method: "POST",
      }),
      env,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("oauth-protected-resource");
  });
});
