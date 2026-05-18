import { describe, expect, test } from "bun:test";

import { cliContract } from "./cli";

describe("cliContract", () => {
  test("exposes OpenAPI-routable CLI operations", () => {
    expect(cliContract.skills.resolveInstall["~orpc"].route).toMatchObject({
      method: "GET",
      path: "/cli/skills/resolve-install",
    });
    expect(cliContract.auth.start["~orpc"].route).toMatchObject({
      method: "POST",
      path: "/cli/auth/start",
    });
    expect(cliContract.auth.session["~orpc"].route).toMatchObject({
      method: "GET",
      path: "/cli/auth/session",
    });
    expect(cliContract.auth.revoke["~orpc"].route).toMatchObject({
      method: "POST",
      path: "/cli/auth/revoke",
    });
  });
});
