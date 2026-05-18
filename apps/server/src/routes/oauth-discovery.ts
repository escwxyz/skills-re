export const MCP_OAUTH_SCOPES = ["skills:read", "skills:library", "skills:usage"] as const;

export const createOAuthProtectedResourceMetadata = (baseUrl: string) => ({
  authorization_servers: [baseUrl],
  bearer_methods_supported: ["header"],
  jwks_uri: `${baseUrl}/auth/jwks`,
  resource: `${baseUrl}/mcp`,
  resource_name: "Skills.re MCP",
  scopes_supported: MCP_OAUTH_SCOPES,
});
