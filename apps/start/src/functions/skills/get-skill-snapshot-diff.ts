import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { fetchSkillSnapshotDiff } from "./skills.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getSkillSnapshotDiff = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      baseSnapshotId: z.string().min(1),
      compareSnapshotId: z.string().min(1),
      skillId: z.string(),
    }),
  )
  .handler(
    async ({ data }) => await fetchSkillSnapshotDiff({ client: createServerORPCClient(), ...data }),
  );
