import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";

import { ApiClient } from "./api-client";
import { createCliConfig } from "./config";
import { installSkill } from "./install";
import { readInstalledSkillContent } from "./read";
import { syncAgentMetadata } from "./sync";
import { resolveAgentTarget, resolveMetadataPath, resolveSkillsDir } from "./targets";
import type { CommandContext, GlobalOptions } from "./types";

const textResult = (text: string) => ({
  content: [{ text, type: "text" as const }],
});

const jsonResult = (value: unknown) => textResult(JSON.stringify(value, null, 2));

export const MCP_TOOL_NAMES = [
  "search_skills",
  "show_skill",
  "read_installed_skill",
  "sync_skills_metadata",
  "install_skill",
] as const;

export const startMcpServer = async (ctx: CommandContext, globalOptions: GlobalOptions) => {
  const config = createCliConfig(globalOptions, ctx.env);
  const apiClient = new ApiClient({ apiUrl: config.apiUrl });
  const server = new McpServer({
    name: "skills-re",
    version: "0.0.0",
  });

  server.registerTool(
    "search_skills",
    {
      description: "Search public Skills.re skills.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional(),
        query: z.string().min(1),
      }),
    },
    async ({ limit, query }) =>
      jsonResult(await apiClient.searchSkills({ limit: limit ?? 10, query })),
  );

  server.registerTool(
    "show_skill",
    {
      description: "Read public metadata for a Skills.re skill.",
      inputSchema: z.object({
        identifier: z.string().min(1),
      }),
    },
    async ({ identifier }) => jsonResult(await apiClient.showSkill(identifier)),
  );

  server.registerTool(
    "read_installed_skill",
    {
      description: "Read an installed local skill on demand.",
      inputSchema: z.object({
        agent: z.string().optional(),
        dir: z.string().optional(),
        name: z.string().min(1),
      }),
    },
    async ({ agent, dir, name }) => {
      const target = resolveAgentTarget(agent);
      const skillsDir = resolveSkillsDir(ctx.cwd, target, dir);
      return textResult(await readInstalledSkillContent(ctx.cwd, skillsDir, name));
    },
  );

  server.registerTool(
    "sync_skills_metadata",
    {
      description: "Update the managed Skills.re metadata block for an agent target.",
      inputSchema: z.object({
        agent: z.string().optional(),
        dir: z.string().optional(),
        output: z.string().optional(),
      }),
    },
    async ({ agent, dir, output }) => {
      const target = resolveAgentTarget(agent);
      return jsonResult(
        await syncAgentMetadata({
          cwd: ctx.cwd,
          metadataPath: resolveMetadataPath(ctx.cwd, target, output),
          skillsDir: resolveSkillsDir(ctx.cwd, target, dir),
          target,
        }),
      );
    },
  );

  server.registerTool(
    "install_skill",
    {
      description: "Install a Skills.re skill into the local filesystem.",
      inputSchema: z.object({
        agent: z.string().optional(),
        dir: z.string().optional(),
        specifier: z.string().min(1),
      }),
    },
    async ({ agent, dir, specifier }) => {
      const target = resolveAgentTarget(agent);
      return jsonResult(
        await installSkill({
          apiClient,
          cwd: ctx.cwd,
          skillsDir: resolveSkillsDir(ctx.cwd, target, dir),
          specifier,
          target,
        }),
      );
    },
  );

  await server.connect(new StdioServerTransport());
};
