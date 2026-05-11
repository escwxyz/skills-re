import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";

export const getSkillVersionHistory = createServerFn({ method: "GET" })
  .inputValidator(z.object({ skillId: z.string() }))
  .handler(async ({ data }) => {
    const client = createServerORPCClient();
    const result = await client.snapshots.listBySkill({ limit: 3, skillId: data.skillId });

    return result.page.map((snapshot, index) => ({
      date: snapshot.sourceCommitDate ?? snapshot.syncTime,
      entryPath: snapshot.entryPath,
      label: index === 0 ? "current" : undefined,
      snapshotId: snapshot.id,
      version: snapshot.version,
    }));
  });
