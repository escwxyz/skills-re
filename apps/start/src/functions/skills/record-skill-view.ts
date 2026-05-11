import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";

export const recordSkillViewFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      path: z.string().min(1).optional(),
      skillId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const client = createServerORPCClient();
    return await client.metrics.recordSkillView({
      path: data.path,
      skillId: data.skillId,
    });
  });
