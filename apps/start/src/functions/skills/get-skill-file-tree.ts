import { createServerFn } from "@tanstack/react-start";
import { resolveSkillBase, resolveSnapshot } from "./skills.server";
import { z } from "zod/v4";
import { createServerORPCClient } from "@/lib/orpc.server";
import { buildFileTreeRows } from "@/view-models/build-file-tree-rows";

export const getSkillFileTreePageData = createServerFn({ method: "GET" })
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
    const snapshotsResult = await client.snapshots.listBySkill({ limit: 3, skillId: skill.id });
    const snapshot = resolveSnapshot(snapshotsResult.page, data.selectedSnapshotId);

    if (!snapshot) {
      return {
        defaultActivePath: null,
        rows: [],
        skillDescription: skill.description,
        skillTitle: skill.title,
        snapshotId: null,
      };
    }

    const treeEntries = await client.snapshots.getSnapshotTreeEntries({
      snapshotId: snapshot.id,
    });

    const filePaths = treeEntries
      .map((entry) => entry.path)
      .toSorted((left, right) => left.localeCompare(right));

    const [firstPath] = filePaths;
    let defaultActivePath: string | undefined = firstPath;

    if (filePaths.includes("SKILL.md")) {
      defaultActivePath = "SKILL.md";
    } else if (filePaths.includes(snapshot.entryPath)) {
      defaultActivePath = snapshot.entryPath;
    }

    return {
      defaultActivePath: defaultActivePath ?? null,
      rows: buildFileTreeRows(treeEntries, defaultActivePath ?? ""),
      skillDescription: skill.description,
      skillTitle: skill.title,
      snapshotId: snapshot.id,
    };
  });
