/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { getSkillsUploadWorkflowScheduler } from "./skills-upload-scheduler";

describe("getSkillsUploadWorkflowScheduler", () => {
  test("supports queue-only scheduling and stages the payload before enqueueing", async () => {
    const storage = new Map<string, string>();
    const sends: {
      message: unknown;
      options?: {
        delaySeconds?: number;
      };
    }[] = [];

    const scheduler = getSkillsUploadWorkflowScheduler({
      SNAPSHOT_FILES: {
        delete: (key: string) => {
          storage.delete(key);
          return Promise.resolve();
        },
        get: (key: string) => {
          const value = storage.get(key);
          return Promise.resolve(
            value
              ? {
                  text: () => Promise.resolve(value),
                }
              : null,
          );
        },
        put: (key: string, value: string) => {
          storage.set(key, value);
          return Promise.resolve({});
        },
      },
      SKILLS_UPLOAD_WORKFLOW_QUEUE: {
        send: (message: unknown, options?: { delaySeconds?: number }) => {
          sends.push({ message, options });
          return Promise.resolve({});
        },
      },
    } as never);

    if (!scheduler) {
      throw new Error("Expected skills upload scheduler.");
    }

    const result = await scheduler.enqueue({
      skills: [
        {
          description: "Example skill",
          directoryPath: "skills/acme/widget",
          entryPath: "skills/acme/widget/SKILL.md",
          initialSnapshot: {
            files: [
              {
                content: "# widget",
                path: "skills/acme/widget/SKILL.md",
              },
            ],
            sourceCommitDate: Date.now(),
            sourceCommitSha: "abc123",
            sourceRef: "main",
            tree: [
              {
                path: "skills/acme/widget/SKILL.md",
                sha: "blob-1",
                type: "blob",
              },
            ],
          },
          slug: "widget",
          sourceLocator: "github.com/acme/widget",
          sourceType: "github",
          title: "Widget",
        },
      ],
    });

    expect(result).toEqual({ workId: expect.any(String) });
    expect(sends).toHaveLength(1);
    expect(sends[0]?.message).toMatchObject({
      kind: "skills-upload",
      payload: {
        stagingKey: expect.stringMatching(/^skills-upload\/staging\//),
      },
      workflowId: expect.stringMatching(/^skills-upload-/),
    });
    expect(sends[0]?.options?.delaySeconds).toBeGreaterThanOrEqual(0);
    expect(sends[0]?.options?.delaySeconds).toBeLessThanOrEqual(30);
    expect(storage.size).toBe(1);
  });
});
