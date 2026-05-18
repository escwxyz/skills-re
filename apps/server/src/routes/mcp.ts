import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPTransport } from "@hono/mcp";
import { getSkillByPath, searchSkills } from "@skills-re/api/modules";
import { Hono } from "hono";
import { z } from "zod/v4";

import { createAiSearchRuntime } from "../ai-search";

const jsonResult = (value: unknown) => ({
  content: [{ text: JSON.stringify(value, null, 2), type: "text" as const }],
});

const createMcpServer = (env: Env) => {
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
    async (input) => jsonResult(await searchSkills(input, createAiSearchRuntime(env as never))),
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
    async (input) => {
      const skill = await getSkillByPath(input);
      if (!skill) {
        const path = [input.authorHandle, input.repoName, input.skillSlug]
          .filter(Boolean)
          .join("/");
        return {
          content: [{ text: `Skill not found: ${path}`, type: "text" as const }],
          isError: true,
        };
      }
      return jsonResult(skill);
    },
  );

  return server;
};

export const mcpRouter = new Hono<{ Bindings: Env }>();

mcpRouter.all("/", async (c) => {
  const server = createMcpServer(c.env);
  const transport = new StreamableHTTPTransport();
  await server.connect(transport);
  const response = await transport.handleRequest(c);
  return response ?? c.body(null, 204);
});
