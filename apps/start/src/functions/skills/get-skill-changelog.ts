import { z } from "zod/v4";
import { resolveSkillBase, resolveSnapshot } from "./skills.server";
import { createServerFn } from "@tanstack/react-start";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getSkillChangelogPageData = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      selectedSnapshotId: z.string().optional(),
      slug: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const skill = await resolveSkillBase(data.slug);
    if (!skill) {
      return null;
    }

    const client = createServerORPCClient();
    const snapshotsResult = await client.snapshots.listBySkill({ limit: 8, skillId: skill.id });
    const snapshots = snapshotsResult.page;
    const currentSnapshot = resolveSnapshot(snapshots, data.selectedSnapshotId);

    return {
      entries: snapshots.map((snapshot, index) => ({
        body: snapshot.description,
        date: snapshot.sourceCommitDate ?? snapshot.syncTime,
        isCurrent: snapshot.id === currentSnapshot?.id || (!data.selectedSnapshotId && index === 0),
        shaLabel: snapshot.hash.slice(0, 7),
        title: snapshot.sourceCommitMessage?.trim() || snapshot.description,
        version: snapshot.version,
      })),
      skillDescription: skill.description,
      skillTitle: skill.title,
    };
  });
