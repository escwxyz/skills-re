import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPTransport } from "@hono/mcp";
import {
  getSkillByPath,
  getSkillRecommendations,
  listMineSavedSkills,
  listMyRecentSkillUsage,
  recordSkillUsage,
  saveSkill,
  searchSkills,
  unsaveSkill,
} from "@skills-re/api/modules";
import type { AuthSession } from "@skills-re/auth";
import { verifyAccessToken } from "better-auth/oauth2";
import { Hono } from "hono";
import { z } from "zod/v4";

import { createAiSearchRuntime } from "../ai-search";

export const REMOTE_MCP_TOOL_NAMES = [
  "search_skills",
  "get_skill",
  "get_my_saved_skills",
  "save_skill",
  "unsave_skill",
  "record_skill_usage",
  "get_my_recently_used",
  "get_skill_recommendations",
] as const;

const jsonResult = (value: unknown) => ({
  content: [{ text: JSON.stringify(value, null, 2), type: "text" as const }],
});

const errorResult = (text: string) => ({
  content: [{ text, type: "text" as const }],
  isError: true,
});

const notAuthed = () =>
  errorResult("Authentication required. Provide a Bearer token via the Authorization header.");

const getBearerToken = (headers: Headers) => {
  const authorization = headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = authorization.slice("bearer ".length).trim();
  return token || null;
};

interface McpAuthResult {
  error?: "invalid-token";
  session: AuthSession;
}

export interface McpRouteDeps {
  getSkillByPath: typeof getSkillByPath;
  getSkillRecommendations: typeof getSkillRecommendations;
  listMineSavedSkills: typeof listMineSavedSkills;
  listMyRecentSkillUsage: typeof listMyRecentSkillUsage;
  recordSkillUsage: typeof recordSkillUsage;
  resolveAuthSession: (input: { env: Env; headers: Headers }) => Promise<McpAuthResult>;
  saveSkill: typeof saveSkill;
  searchSkills: typeof searchSkills;
  unsaveSkill: typeof unsaveSkill;
}

const defaultResolveAuthSession: McpRouteDeps["resolveAuthSession"] = async ({ env, headers }) => {
  const { createRuntimeAuth } = await import("@skills-re/auth/runtime");
  const runtimeAuth = createRuntimeAuth();
  const session = await runtimeAuth.api.getSession({ headers }).catch(() => null);
  if (session?.user) {
    return { session };
  }

  const token = getBearerToken(headers);
  if (!token) {
    return { session: null };
  }

  try {
    const base = env.PUBLIC_SERVER_URL;
    const payload = await verifyAccessToken(token, {
      jwksUrl: `${base}/auth/jwks`,
      verifyOptions: {
        audience: `${base}/mcp`,
        issuer: base,
      },
    });
    const userId = typeof payload.sub === "string" ? payload.sub : undefined;
    if (!userId) {
      return { error: "invalid-token", session: null };
    }
    return {
      session: {
        session: {
          expiresAt:
            typeof payload.exp === "number" ? new Date(payload.exp * 1000).toISOString() : "",
          id: typeof payload.jti === "string" ? payload.jti : "oauth-access-token",
          userId,
        },
        user: {
          email: typeof payload.email === "string" ? payload.email : undefined,
          id: userId,
          name: typeof payload.name === "string" ? payload.name : undefined,
        },
      },
    };
  } catch {
    return { error: "invalid-token", session: null };
  }
};

const defaultDeps: McpRouteDeps = {
  getSkillByPath,
  getSkillRecommendations,
  listMineSavedSkills,
  listMyRecentSkillUsage,
  recordSkillUsage,
  resolveAuthSession: defaultResolveAuthSession,
  saveSkill,
  searchSkills,
  unsaveSkill,
};

const requireUserId = (session: AuthSession) => session?.user?.id ?? null;

export const createMcpServer = (input: {
  deps?: Partial<McpRouteDeps>;
  env: Env;
  session: AuthSession;
}) => {
  const deps = { ...defaultDeps, ...input.deps };
  const server = new McpServer({ name: "skills-re", version: "1.0.0" });

  server.registerTool(
    "search_skills",
    {
      description:
        "Search public Skills.re skills by keyword, category, or tag. Each result includes authorHandle, repoName, and slug — pass these to get_skill to retrieve full metadata.",
      inputSchema: z.object({
        categories: z.array(z.string().min(1)).optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
        query: z.string().min(1).optional(),
        sort: z
          .enum(["newest", "updated", "views", "downloads-trending", "downloads-all-time", "stars"])
          .optional(),
        tags: z.array(z.string().min(1)).optional(),
      }),
    },
    async (toolInput) =>
      jsonResult(await deps.searchSkills(toolInput, createAiSearchRuntime(input.env as never))),
  );

  server.registerTool(
    "get_skill",
    {
      description:
        "Get full metadata for a Skills.re skill by its path. Use the authorHandle, repoName, and skillSlug from search_skills results. Returns description, version, author, repo URL, categories, and download stats.",
      inputSchema: z.object({
        authorHandle: z.string().min(1),
        repoName: z.string().min(1).optional(),
        skillSlug: z.string().min(1),
      }),
    },
    async (toolInput) => {
      const skill = await deps.getSkillByPath(toolInput);
      if (!skill) {
        const path = [toolInput.authorHandle, toolInput.repoName, toolInput.skillSlug]
          .filter(Boolean)
          .join("/");
        return errorResult(`Skill not found: ${path}`);
      }
      return jsonResult(skill);
    },
  );

  server.registerTool(
    "get_my_saved_skills",
    {
      description:
        "List skills saved to the authenticated user's library. Requires authentication.",
      inputSchema: z.object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    },
    async (toolInput) => {
      const userId = requireUserId(input.session);
      if (!userId) {
        return notAuthed();
      }
      try {
        return jsonResult(await deps.listMineSavedSkills({ userId, ...toolInput }));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : "Saved skills lookup failed.");
      }
    },
  );

  server.registerTool(
    "save_skill",
    {
      description:
        "Save a skill to the authenticated user's library by slug. Requires authentication.",
      inputSchema: z.object({
        slug: z.string().min(1),
      }),
    },
    async ({ slug }) => {
      const userId = requireUserId(input.session);
      if (!userId) {
        return notAuthed();
      }
      try {
        return jsonResult(await deps.saveSkill({ slug, userId }));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : "Save failed.");
      }
    },
  );

  server.registerTool(
    "unsave_skill",
    {
      description:
        "Remove a skill from the authenticated user's library by slug. Requires authentication.",
      inputSchema: z.object({
        slug: z.string().min(1),
      }),
    },
    async ({ slug }) => {
      const userId = requireUserId(input.session);
      if (!userId) {
        return notAuthed();
      }
      try {
        return jsonResult(await deps.unsaveSkill({ slug, userId }));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : "Unsave failed.");
      }
    },
  );

  server.registerTool(
    "record_skill_usage",
    {
      description:
        "Record that an authenticated agent used a Skills.re skill for a task. Requires authentication.",
      inputSchema: z.object({
        agentName: z.string().min(1).optional(),
        projectContext: z.string().min(1).optional(),
        skillPath: z.string().min(1).optional(),
        skillSlug: z.string().min(1),
        taskDescription: z.string().min(1).optional(),
      }),
    },
    async (toolInput) => {
      const userId = requireUserId(input.session);
      if (!userId) {
        return notAuthed();
      }
      return jsonResult(await deps.recordSkillUsage({ ...toolInput, userId }));
    },
  );

  server.registerTool(
    "get_my_recently_used",
    {
      description: "List recently used Skills.re skills for the authenticated user.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).optional(),
      }),
    },
    async (toolInput) => {
      const userId = requireUserId(input.session);
      if (!userId) {
        return notAuthed();
      }
      return jsonResult(await deps.listMyRecentSkillUsage({ userId, ...toolInput }));
    },
  );

  server.registerTool(
    "get_skill_recommendations",
    {
      description:
        "Recommend Skills.re skills for the authenticated user based on saved skills, recent usage, and optional task or project context.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).optional(),
        projectContext: z.string().min(1).optional(),
        taskDescription: z.string().min(1).optional(),
      }),
    },
    async (toolInput) => {
      const userId = requireUserId(input.session);
      if (!userId) {
        return notAuthed();
      }
      return jsonResult(await deps.getSkillRecommendations({ userId, ...toolInput }));
    },
  );

  return server;
};

export const createMcpRouter = (deps: Partial<McpRouteDeps> = {}) => {
  const router = new Hono<{ Bindings: Env }>();

  router.all("/", async (c) => {
    const auth = await (deps.resolveAuthSession ?? defaultResolveAuthSession)({
      env: c.env,
      headers: c.req.raw.headers,
    });
    if (auth.error === "invalid-token") {
      c.header(
        "WWW-Authenticate",
        `Bearer resource_metadata="${c.env.PUBLIC_SERVER_URL}/.well-known/oauth-protected-resource"`,
      );
      return c.json({ code: "UNAUTHORIZED", message: "Invalid or expired bearer token." }, 401);
    }

    const server = createMcpServer({ deps, env: c.env, session: auth.session });
    const transport = new StreamableHTTPTransport();
    await server.connect(transport);
    const response = await transport.handleRequest(c);
    return response ?? c.body(null, 204);
  });

  return router;
};

export const mcpRouter = createMcpRouter();
