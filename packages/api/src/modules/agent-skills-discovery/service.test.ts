/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createAgentSkillsDiscoveryService } from "./service";

const VALID_HASH = "a".repeat(64);

const baseRow = {
  description: "Use this skill for widget work.",
  fileHash: VALID_HASH,
  latestSnapshotId: "snap_1",
  name: "Widget Skill",
  r2Key: "snapshots/snap_1/SKILL.md",
  slug: "widget-skill",
};

describe("createAgentSkillsDiscoveryService", () => {
  test("maps valid public artifact rows into discovery index entries", async () => {
    const service = createAgentSkillsDiscoveryService({
      getAgentSkillArtifactBySnapshotId: async () => null,
      listPublicAgentSkillArtifacts: async () => [baseRow],
    });

    await expect(service.getDiscoveryIndex()).resolves.toEqual({
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: [
        {
          description: "Use this skill for widget work.",
          digest: `sha256:${VALID_HASH}`,
          name: "widget-skill",
          type: "skill-md",
          url: "/.well-known/agent-skills/snap_1/SKILL.md",
        },
      ],
    });
  });

  test("omits rows without fetchable valid skill metadata", async () => {
    const service = createAgentSkillsDiscoveryService({
      getAgentSkillArtifactBySnapshotId: async () => null,
      listPublicAgentSkillArtifacts: async () => [
        baseRow,
        { ...baseRow, latestSnapshotId: null, slug: "missing-snapshot" },
        { ...baseRow, r2Key: null, slug: "missing-object" },
        { ...baseRow, fileHash: "not-a-hash", slug: "bad-hash" },
        { ...baseRow, description: "   ", slug: "empty-description" },
        { ...baseRow, slug: "-bad-name" },
      ],
    });

    const index = await service.getDiscoveryIndex();

    expect(index.skills.map((skill) => skill.name)).toEqual(["widget-skill"]);
  });

  test("sorts entries deterministically by name and artifact url", async () => {
    const service = createAgentSkillsDiscoveryService({
      getAgentSkillArtifactBySnapshotId: async () => null,
      listPublicAgentSkillArtifacts: async () => [
        { ...baseRow, latestSnapshotId: "snap_b", slug: "beta" },
        { ...baseRow, latestSnapshotId: "snap_a2", slug: "alpha" },
        { ...baseRow, latestSnapshotId: "snap_a1", slug: "alpha" },
      ],
    });

    const index = await service.getDiscoveryIndex();

    expect(index.skills.map((skill) => skill.url)).toEqual([
      "/.well-known/agent-skills/snap_a1/SKILL.md",
      "/.well-known/agent-skills/snap_a2/SKILL.md",
      "/.well-known/agent-skills/snap_b/SKILL.md",
    ]);
  });

  test("returns artifact metadata only when the snapshot artifact is fetchable", async () => {
    const service = createAgentSkillsDiscoveryService({
      getAgentSkillArtifactBySnapshotId: async (snapshotId) =>
        snapshotId === "snap_1"
          ? {
              contentType: "text/markdown; charset=utf-8",
              fileHash: VALID_HASH,
              path: "SKILL.md",
              r2Key: "snapshots/snap_1/SKILL.md",
              size: 42,
              snapshotId,
            }
          : null,
      listPublicAgentSkillArtifacts: async () => [],
    });

    await expect(service.getArtifactMetadata({ snapshotId: "snap_1" })).resolves.toEqual({
      contentType: "text/markdown; charset=utf-8",
      fileHash: VALID_HASH,
      path: "SKILL.md",
      r2Key: "snapshots/snap_1/SKILL.md",
      size: 42,
      snapshotId: "snap_1",
    });
    await expect(service.getArtifactMetadata({ snapshotId: "snap_2" })).resolves.toBeNull();
  });
});
