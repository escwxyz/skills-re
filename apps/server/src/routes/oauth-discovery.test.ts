import { describe, expect, test } from "bun:test";

import { createOAuthProtectedResourceMetadata } from "./oauth-discovery";

describe("OAuth protected-resource discovery", () => {
  test("describes the remote MCP resource and authorization server", () => {
    expect(createOAuthProtectedResourceMetadata("https://api.skills.re")).toEqual({
      authorization_servers: ["https://api.skills.re"],
      bearer_methods_supported: ["header"],
      jwks_uri: "https://api.skills.re/auth/jwks",
      resource: "https://api.skills.re/mcp",
      resource_name: "Skills.re MCP",
      scopes_supported: ["skills:read", "skills:library", "skills:usage"],
    });
  });
});
