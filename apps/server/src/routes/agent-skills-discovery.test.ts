// oxlint-disable require-await
/// <reference types="bun-types" />

import { createHash } from "node:crypto";

import { describe, expect, test } from "bun:test";

import {
  createAgentSkillMdResponse,
  createAgentSkillsDiscoveryIndexResponse,
  setAgentSkillsDiscoveryHeaders,
} from "./agent-skills-discovery";

const skillContent = "---\nname: widget-skill\ndescription: Widget skill\n---\n# Widget\n";
const skillBytes = new TextEncoder().encode(skillContent);
const skillHash = createHash("sha256").update(skillBytes).digest("hex");

describe("agent skills discovery routes", () => {
  test("returns the discovery index with public JSON headers", async () => {
    const response = await createAgentSkillsDiscoveryIndexResponse({
      getDiscoveryIndex: async () => ({
        $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
        skills: [
          {
            description: "Widget skill",
            digest: `sha256:${skillHash}`,
            name: "widget-skill",
            type: "skill-md",
            url: "/.well-known/agent-skills/snap_1/SKILL.md",
          },
        ],
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    await expect(response.json()).resolves.toMatchObject({
      skills: [
        {
          digest: `sha256:${skillHash}`,
          url: "/.well-known/agent-skills/snap_1/SKILL.md",
        },
      ],
    });
  });

  test("serves skill-md artifact bytes matching the advertised digest", async () => {
    const response = await createAgentSkillMdResponse(
      { method: "GET", snapshotId: "snap_1" },
      {
        getArtifactMetadata: async () => ({
          contentType: "text/markdown; charset=utf-8",
          fileHash: skillHash,
          path: "SKILL.md",
          r2Key: "snapshots/snap_1/SKILL.md",
          size: skillBytes.byteLength,
          snapshotId: "snap_1",
        }),
        snapshotStorage: {
          buildSnapshotFilePublicUrl: () => "https://r2.example.com/snapshots/snap_1/SKILL.md",
          getSnapshotArchiveObject: async () => null,
          getSnapshotFileObject: async () => ({
            arrayBuffer: async () => skillBytes.buffer.slice(0),
            body: skillBytes,
            size: skillBytes.byteLength,
          }),
        },
      },
    );

    const body = await response.arrayBuffer();
    const digest = createHash("sha256").update(Buffer.from(body)).digest("hex");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("content-length")).toBe(String(skillBytes.byteLength));
    expect(digest).toBe(skillHash);
  });

  test("serves HEAD artifact headers without a body", async () => {
    const response = await createAgentSkillMdResponse(
      { method: "HEAD", snapshotId: "snap_1" },
      {
        getArtifactMetadata: async () => ({
          contentType: "text/markdown; charset=utf-8",
          fileHash: skillHash,
          path: "SKILL.md",
          r2Key: "snapshots/snap_1/SKILL.md",
          size: skillBytes.byteLength,
          snapshotId: "snap_1",
        }),
        snapshotStorage: {
          buildSnapshotFilePublicUrl: () => "https://r2.example.com/snapshots/snap_1/SKILL.md",
          getSnapshotArchiveObject: async () => null,
          getSnapshotFileObject: async () => ({
            arrayBuffer: async () => skillBytes.buffer.slice(0),
            body: skillBytes,
            size: skillBytes.byteLength,
          }),
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
    expect(response.headers.get("content-length")).toBe(String(skillBytes.byteLength));
  });

  test("returns 404 when artifact metadata or bytes are unavailable", async () => {
    const missingMetadata = await createAgentSkillMdResponse(
      { method: "GET", snapshotId: "missing" },
      {
        getArtifactMetadata: async () => null,
        snapshotStorage: {
          buildSnapshotFilePublicUrl: () => "https://r2.example.com/missing",
          getSnapshotArchiveObject: async () => null,
          getSnapshotFileObject: async () => null,
        },
      },
    );
    const missingObject = await createAgentSkillMdResponse(
      { method: "GET", snapshotId: "snap_1" },
      {
        getArtifactMetadata: async () => ({
          contentType: "text/markdown; charset=utf-8",
          fileHash: skillHash,
          path: "SKILL.md",
          r2Key: "snapshots/snap_1/SKILL.md",
          size: skillBytes.byteLength,
          snapshotId: "snap_1",
        }),
        snapshotStorage: {
          buildSnapshotFilePublicUrl: () => "https://r2.example.com/snapshots/snap_1/SKILL.md",
          getSnapshotArchiveObject: async () => null,
          getSnapshotFileObject: async () => null,
        },
      },
    );

    expect(missingMetadata.status).toBe(404);
    expect(missingObject.status).toBe(404);
  });

  test("sets public discovery headers", () => {
    const headers = new Headers();

    setAgentSkillsDiscoveryHeaders(headers);

    expect(headers.get("access-control-allow-origin")).toBe("*");
    expect(headers.get("access-control-allow-methods")).toBe("GET, HEAD, OPTIONS");
    expect(headers.get("cache-control")).toBe("public, max-age=3600");
  });
});
