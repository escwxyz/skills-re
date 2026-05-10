import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";
import { renderSkillContent } from "@/utils/skill-detail";

export const getSkillFileContent = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      path: z.string(),
      snapshotId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const client = createServerORPCClient();
    const content = await client.snapshots.readSnapshotFileContent({
      maxBytes: 160_000,
      path: data.path,
      snapshotId: data.snapshotId,
    });

    return {
      html: await renderSkillContent({
        content: content.content,
        path: data.path,
      }),
      isTruncated: content.isTruncated,
      totalBytes: content.totalBytes,
    };
  });
