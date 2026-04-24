/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { fetchGithubJson } from "./github-api";
import type { WorkerLogFields, WorkerLogger } from "./worker-logger";

const createCapturingLogger = (
  logs: { event: string; fields?: WorkerLogFields }[],
  baseFields: WorkerLogFields = {},
): WorkerLogger => ({
  child(fields) {
    return createCapturingLogger(logs, {
      ...baseFields,
      ...fields,
    });
  },
  debug(event, fields) {
    logs.push({ event, fields: { ...baseFields, ...fields } });
  },
  error(event, fields) {
    logs.push({ event, fields: { ...baseFields, ...fields } });
  },
  info(event, fields) {
    logs.push({ event, fields: { ...baseFields, ...fields } });
  },
  warn(event, fields) {
    logs.push({ event, fields: { ...baseFields, ...fields } });
  },
});

describe("fetchGithubJson", () => {
  test("includes GitHub error messages and structured diagnostic headers for failures", async () => {
    const logs: { event: string; fields?: WorkerLogFields }[] = [];
    const logger = createCapturingLogger(logs);
    const fetchImpl = (() =>
      Response.json(
        {
          documentation_url: "https://docs.github.com/rest",
          message: "Resource not accessible by personal access token",
        },
        {
          headers: {
            "x-accepted-github-permissions": "metadata=read",
            "x-github-request-id": "ABC:123",
            "x-ratelimit-remaining": "4999",
            "x-ratelimit-resource": "core",
          },
          status: 403,
        },
      )) as unknown as typeof fetch;

    await expect(
      fetchGithubJson(
        fetchImpl,
        "https://api.github.com/repos/acme/new-skills",
        {},
        {
          includeResponseMessage: true,
          logger,
          logContext: {
            operation: "repo-overview",
            owner: "acme",
            repo: "new-skills",
          },
        },
      ),
    ).rejects.toThrow(
      "GitHub request failed with 403 for https://api.github.com/repos/acme/new-skills — Resource not accessible by personal access token",
    );

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      event: "github.request.failed",
      fields: {
        documentationUrl: "https://docs.github.com/rest",
        operation: "repo-overview",
        owner: "acme",
        repo: "new-skills",
        status: 403,
      },
    });
    expect(logs[0]?.fields?.headers).toMatchObject({
      acceptedGithubPermissions: "metadata=read",
      githubRequestId: "ABC:123",
      rateLimitRemaining: "4999",
      rateLimitResource: "core",
    });
    expect(logs[0]?.fields?.body).toContain("Resource not accessible by personal access token");
  });
});
