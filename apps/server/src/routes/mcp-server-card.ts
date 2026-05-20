import { REMOTE_MCP_TOOL_NAMES } from "./mcp";

const MCP_SERVER_NAME = "skills-re";
const MCP_SERVER_VERSION = "1.0.0";

const toEndpointUrl = (baseUrl: string) => new URL("/mcp", baseUrl).toString();

export const createMcpServerCard = (baseUrl: string) => {
  const endpoint = toEndpointUrl(baseUrl);

  return {
    $schema: "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
    capabilities: {
      prompts: false,
      resources: false,
      tools: true,
    },
    description: "Skills.re remote MCP server for discovering and managing agent skills.",
    name: "re.skills/mcp",
    remotes: [
      {
        type: "streamable-http",
        url: endpoint,
      },
    ],
    serverInfo: {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
    title: "Skills.re MCP",
    transport: {
      endpoint,
      type: "streamable-http",
    },
    version: MCP_SERVER_VERSION,
    websiteUrl: "https://skills.re",
    _meta: {
      tools: [...REMOTE_MCP_TOOL_NAMES],
    },
  };
};

export const setMcpServerCardHeaders = (headers: Headers) => {
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "public, max-age=3600");
};
