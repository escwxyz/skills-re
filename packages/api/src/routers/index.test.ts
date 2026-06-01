/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { appRouter } from "./index";

describe("app router", () => {
  test("exposes skill eval sandbox routes", () => {
    expect(appRouter.skillEvalSandbox).toBeDefined();
    expect(appRouter.skillEvalSandbox.listAgents).toBeDefined();
    expect(appRouter.skillEvalSandbox.getSuite).toBeDefined();
    expect(appRouter.skillEvalSandbox.createRun).toBeDefined();
    expect(appRouter.skillEvalSandbox.listRunsBySkill).toBeDefined();
    expect(appRouter.skillEvalSandbox.getRunDetail).toBeDefined();
    expect(appRouter.skillEvalSandbox.createStreamToken).toBeDefined();
  });
});
