import { z } from "zod/v4";
import { createServerFn } from "@tanstack/react-start";
import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchSkillChangelog } from "./skills.server";

export const getSkillChangelog = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      selectedSnapshotId: z.string().optional(),
      skillSlug: z.string(),
    }),
  )
  .handler(
    async ({ data }) =>
      await fetchSkillChangelog({
        client: createServerORPCClient(),
        skillSlug: data.skillSlug,
        selectedSnapshotId: data.selectedSnapshotId,
      }),
  );
