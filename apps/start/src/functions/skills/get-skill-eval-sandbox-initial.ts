import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchSkillEvalSandboxInitial } from "./skills.server";

export const getSkillEvalSandboxInitial = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      selectedSnapshotId: z.string().optional(),
      skillSlug: z.string(),
    }),
  )
  .handler(
    async ({ data }) =>
      await fetchSkillEvalSandboxInitial({
        client: createServerORPCClient(),
        selectedSnapshotId: data.selectedSnapshotId,
        skillSlug: data.skillSlug,
      }),
  );
