/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createStaticAuditGithubRuntime } from "./static-audits-github";

describe("static audit github runtime", () => {
  test("returns no-targets when there are no dispatch targets", async () => {
    const runtime = createStaticAuditGithubRuntime({});

    await expect(runtime.dispatchStaticAuditWorkflow([])).resolves.toEqual({
      dispatched: false,
      reason: "no-targets",
    });
  });

  test("dispatches the configured GitHub workflow", async () => {
    const requests: { body: string; headers: Headers; url: string }[] = [];
    const runtime = createStaticAuditGithubRuntime(
      {
        GH_PAT: "token",
        SKILL_AUDIT_GITHUB_REPO: "acme/skills-audit",
        SKILL_AUDIT_GITHUB_WORKFLOW_FILE: "skill-audit-submit.yml",
        SKILL_AUDIT_GITHUB_WORKFLOW_REF: "main",
      },
      {
        fetch: (async (input, init) => {
          const request = new Request(typeof input === "string" ? input : input.toString(), init);
          requests.push({
            body: await request.text(),
            headers: request.headers,
            url: request.url,
          });
          return new Response("", { status: 204 });
        }) as typeof fetch,
      },
    );

    await expect(
      runtime.dispatchStaticAuditWorkflow([
        {
          owner: "acme",
          repo: "skills",
          snapshotId: "snapshot-1",
        },
      ]),
    ).resolves.toEqual({
      dispatched: true,
      repository: "acme/skills-audit",
      workflowFile: "skill-audit-submit.yml",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer token");
    expect(requests[0]?.url).toBe(
      "https://api.github.com/repos/acme/skills-audit/actions/workflows/skill-audit-submit.yml/dispatches",
    );
    expect(JSON.parse(requests[0]?.body ?? "{}")).toMatchObject({
      ref: "main",
      inputs: {
        targets_json: JSON.stringify([
          {
            owner: "acme",
            repo: "skills",
            snapshotId: "snapshot-1",
          },
        ]),
      },
    });
  });
});
