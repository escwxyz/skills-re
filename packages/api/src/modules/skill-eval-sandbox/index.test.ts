/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { parseSkillEvalSuite, skillEvalSandboxRepo, skillEvalSandboxService } from "./index";

describe("skill eval sandbox module", () => {
  test("exports parser, repo, and service surfaces", () => {
    expect(parseSkillEvalSuite).toBeDefined();
    expect(skillEvalSandboxRepo).toBeDefined();
    expect(skillEvalSandboxService).toBeDefined();
  });
});
